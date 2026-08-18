const { getPool } = require('../utils/db');
const { calculatePriceBreakdown } = require('./pricing.service');
const { validatePromotionInternal } = require('./promotion.service');
const logger = require('../utils/logger');
const { recordBookingSuccess, recordBookingFailure } = require('./monitoring.service');

const generateUniqueReference = async (connection) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  let exists = true;

  while (exists) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ref = `CRZ-${code}`;

    const [rows] = await connection.query('SELECT id FROM bookings WHERE booking_reference = ?', [ref]);
    if (rows.length === 0) {
      exists = false;
    }
  }

  return ref;
};

const confirmBookingInternal = async ({
  customer: customerInput,
  cruiseId,
  passengers,
  selectedOptionalServiceIds = [],
  promoCode = '',
  currentDate = new Date().toISOString().split('T')[0],
}) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  logger.info('booking_attempt', `Attempting booking for cruise ${cruiseId}`, {
    cruiseId,
    passengerCount: passengers?.length,
    selectedOptionalServiceIds,
    promoCode,
  });

  try {
    await connection.beginTransaction();

    // 1. Lock and retrieve Cruise details
    const [cruiseRows] = await connection.query(
      'SELECT * FROM cruises WHERE id = ? FOR UPDATE',
      [cruiseId]
    );
    const cruise = cruiseRows[0];
    if (!cruise) {
      throw new Error(`Cruise '${cruiseId}' not found.`);
    }

    // 2. Validate passengers & count
    const totalPassengers = Array.isArray(passengers) ? passengers.length : 0;
    if (totalPassengers === 0) {
      throw new Error('At least one passenger is required.');
    }
    if (totalPassengers > 6) {
      throw new Error('Booking party size cannot exceed 6 passengers.');
    }

    // 3. Check capacity
    if (cruise.available_seats < totalPassengers) {
      throw new Error(
        `Insufficient capacity on '${cruise.name}'. ` +
        `Requested: ${totalPassengers}, Available: ${cruise.available_seats}.`
      );
    }

    // 4. Resolve or upsert customer
    let customerId = customerInput.id;
    if (!customerId) {
      // Find customer by email
      const [custRows] = await connection.query('SELECT id FROM customers WHERE email = ?', [customerInput.email]);
      if (custRows.length > 0) {
        customerId = custRows[0].id;
        // Update customer details
        await connection.query(
          'UPDATE customers SET name = ?, phone = ? WHERE id = ?',
          [customerInput.name, customerInput.phone || '', customerId]
        );
      } else {
        customerId = `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await connection.query(
          'INSERT INTO customers (id, name, email, phone) VALUES (?, ?, ?, ?)',
          [customerId, customerInput.name, customerInput.email, customerInput.phone || '']
        );
      }
    } else {
      // Update existing customer
      await connection.query(
        'UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?',
        [customerInput.name, customerInput.email, customerInput.phone || '', customerId]
      );
    }

    // 5. Calculate price breakdown
    const priceBreakdown = await calculatePriceBreakdown({
      cruiseId,
      passengers,
      selectedOptionalServiceIds,
      promoCode,
      customerId,
      currentDate,
      dbConnection: connection,
    });

    // 6. Validate Promo Code if provided
    let promoValidation = null;
    let promoCodeId = null;
    if (promoCode && promoCode.trim()) {
      promoValidation = await validatePromotionInternal({
        promoCode,
        customerId,
        preDiscountSubtotalCents: priceBreakdown.preDiscountSubtotalCents,
        currentDate,
        dbConnection: connection,
      });

      if (!promoValidation.valid) {
        throw new Error(`Promotion rejected: ${promoValidation.error}`);
      }
      promoCodeId = promoValidation.promotion.id;
    }

    // 7. Update Cruise capacity
    const [updateResult] = await connection.query(
      'UPDATE cruises SET available_seats = available_seats - ? WHERE id = ? AND available_seats >= ?',
      [totalPassengers, cruiseId, totalPassengers]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(`Insufficient capacity on '${cruise.name}' at commit time.`);
    }

    // 8. Generate booking reference
    const reference = await generateUniqueReference(connection);
    const bookingId = `BKG-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    // 9. Build booking record
    const bookingRecord = {
      id: bookingId,
      bookingReference: reference,
      createdAt: new Date().toISOString(),
      customer: {
        id: customerId,
        name: customerInput.name,
        email: customerInput.email,
        phone: customerInput.phone || '',
      },
      cruise: {
        id: cruise.id,
        line: cruise.line,
        name: cruise.name,
        destination: cruise.destination,
        durationNights: cruise.duration_nights,
        baseAdultFare: parseFloat(cruise.base_adult_fare),
      },
      passengers: priceBreakdown.passengers.breakdown,
      passengerCounts: {
        adults: priceBreakdown.passengers.adultCount,
        children: priceBreakdown.passengers.childCount,
        total: priceBreakdown.passengers.totalPassengers,
      },
      selectedOptionalServices: priceBreakdown.optionalServices.items,
      appliedPromotionalCode: priceBreakdown.promotionalDiscount?.applied
        ? {
            code: priceBreakdown.promotionalDiscount.code,
            discountType: priceBreakdown.promotionalDiscount.discountType,
            discountValue: priceBreakdown.promotionalDiscount.discountValue,
            discountAmount: priceBreakdown.promotionalDiscount.amount,
            discountAmountCents: priceBreakdown.promotionalDiscount.amountCents,
          }
        : null,
      priceBreakdown,
      pricingRulesSnapshot: priceBreakdown.pricingRulesSnapshot,
      finalTotal: priceBreakdown.finalTotal,
      finalTotalCents: priceBreakdown.finalTotalCents,
    };

    // 10. Persist Booking
    await connection.query(
      `INSERT INTO bookings (
        id, booking_reference, customer_id, cruise_id, passengers, services, 
        promo_code_id, subtotal, discount, tax, total, price_snapshot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
      [
        bookingRecord.id,
        bookingRecord.bookingReference,
        customerId,
        cruiseId,
        JSON.stringify(bookingRecord.passengers),
        JSON.stringify(bookingRecord.selectedOptionalServices),
        promoCodeId,
        bookingRecord.priceBreakdown.preDiscountSubtotal,
        bookingRecord.priceBreakdown.promotionalDiscount?.amount || 0.00,
        bookingRecord.priceBreakdown.tax.amount,
        bookingRecord.priceBreakdown.finalTotal,
        JSON.stringify(bookingRecord),
      ]
    );

    // 11. Record Promo Redemption
    if (priceBreakdown.promotionalDiscount?.applied) {
      await connection.query(
        `INSERT INTO promo_redemptions (
          promo_code, promo_code_id, booking_reference, customer_id, discount_amount
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          priceBreakdown.promotionalDiscount.code,
          promoCodeId,
          reference,
          customerId,
          priceBreakdown.promotionalDiscount.amount,
        ]
      );
    }

    await connection.commit();
    
    logger.info('booking_success', `Successfully confirmed booking reference ${bookingRecord.bookingReference}`, {
      bookingReference: bookingRecord.bookingReference,
      cruiseId: bookingRecord.cruise.id,
      finalTotal: bookingRecord.finalTotal,
    });
    recordBookingSuccess();

    return bookingRecord;
  } catch (error) {
    await connection.rollback();
    
    logger.error('booking_failure', `Booking confirmation failed: ${error.message}`, {
      cruiseId,
      error: error.message,
    });
    recordBookingFailure();

    throw error;
  } finally {
    connection.release();
  }
};

const getBookingByReference = async (reference) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT price_snapshot FROM bookings WHERE booking_reference = ?', [reference]);
  if (rows.length === 0) {
    return null;
  }
  // Return the fully detailed snapshot stored during booking confirmation
  return typeof rows[0].price_snapshot === 'string'
    ? JSON.parse(rows[0].price_snapshot)
    : rows[0].price_snapshot;
};

module.exports = {
  confirmBookingInternal,
  getBookingByReference,
};
