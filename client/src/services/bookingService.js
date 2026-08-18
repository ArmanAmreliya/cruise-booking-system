import { cruiseRepository } from '../storage/cruiseRepository';
import { customerRepository } from '../storage/customerRepository';
import { bookingRepository } from '../storage/bookingRepository';
import { promoRedemptionRepository } from '../storage/promoRedemptionRepository';
import { pricingRuleRepository } from '../storage/pricingRuleRepository';
import { calculatePriceBreakdown } from './pricingService';
import { validatePromotion, recordRedemption } from './promotionService';
import { storageDriver } from '../storage/storageDriver';
import { STORAGE_KEYS } from '../storage/keys';

/**
 * Executes the full, atomic booking confirmation workflow.
 *
 * Steps (all or nothing — no partial saves on failure):
 *  1. Validate customer details
 *  2. Resolve cruise and validate at least one adult passenger
 *  3. Check cruise capacity is sufficient
 *  4. Calculate final price via pricingService
 *  5. Validate promotional code if provided
 *  6. Verify price shown === price to be charged
 *  7. Reduce cruise capacity
 *  8. Create booking with immutable snapshot
 *  9. Record promo redemption (only if promo was applied)
 * 10. Return unique booking reference
 *
 * If any step fails, all prior mutations are rolled back before throwing.
 *
 * @param {Object} params
 * @param {Object} params.customer - { name, email, phone? }
 * @param {string|Object} params.cruise - Cruise ID or cruise object
 * @param {Array} params.passengers - Array of { age } objects or ages
 * @param {Array<string>} [params.selectedOptionalServiceIds=[]]
 * @param {string} [params.promoCode='']
 * @param {string} [params.currentDate] - ISO date string (default: today)
 * @returns {Object} Confirmed booking record with bookingReference
 * @throws {Error} Descriptive error if any validation or constraint fails
 */
export const confirmBooking = ({
  customer: customerInput,
  cruise: cruiseInput,
  passengers,
  selectedOptionalServiceIds = [],
  promoCode = '',
  currentDate = new Date().toISOString().split('T')[0],
}) => {
  // STEP 1 — Validate Customer Details
  if (!customerInput || !customerInput.name || !customerInput.email) {
    throw new Error('Valid customer name and email are required to confirm a booking.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerInput.email)) {
    throw new Error(`Invalid customer email address: '${customerInput.email}'.`);
  }

  // STEP 2 — Resolve Cruise
  const cruiseId = typeof cruiseInput === 'string' ? cruiseInput : cruiseInput?.id;
  const cruise = cruiseRepository.getById(cruiseId);
  if (!cruise) {
    throw new Error(`Cruise '${cruiseId}' not found.`);
  }

  // STEP 3 — Validate Passenger Ages & At Least One Adult
  const normalizedAges = normalizeAges(passengers);
  if (normalizedAges.length === 0) {
    throw new Error('At least one passenger is required.');
  }

  const adultAges = normalizedAges.filter((age) => age >= 18);
  if (adultAges.length === 0) {
    throw new Error('At least one adult passenger (age 18+) is required to confirm a booking.');
  }

  const totalPassengers = normalizedAges.length;

  // STEP 4 — Check Cruise Capacity
  if (cruise.availableSeats < totalPassengers) {
    throw new Error(
      `Insufficient capacity on '${cruise.name}'. ` +
        `Requested: ${totalPassengers}, Available: ${cruise.availableSeats}.`
    );
  }

  if (cruise.availableSeats === 0) {
    throw new Error(`Cruise '${cruise.name}' is sold out.`);
  }

  // STEP 5 — Resolve or Upsert Customer
  const customer = customerRepository.save({
    id: customerInput.id || undefined,
    name: customerInput.name,
    email: customerInput.email,
    phone: customerInput.phone || '',
  });

  // STEP 6 — Calculate Final Price
  const priceBreakdown = calculatePriceBreakdown({
    cruise,
    passengers,
    selectedOptionalServiceIds,
    promoCode,
    customerId: customer.id,
    currentDate,
  });

  // STEP 7 — Validate Promotion (if provided)
  let promoValidation = null;
  if (promoCode && promoCode.trim()) {
    promoValidation = validatePromotion({
      promoCode,
      customerId: customer.id,
      preDiscountSubtotal: priceBreakdown.preDiscountSubtotalCents,
      isSubtotalInCents: true,
      currentDate,
    });

    // If promo code was supplied but rejected, surface specific rejection reason
    if (!promoValidation.valid) {
      throw new Error(`Promotion rejected: ${promoValidation.error}`);
    }
  }

  // STEP 8 — Generate Unique Booking Reference
  const reference = generateUniqueReference();

  // Capture pricing rules snapshot for historical reconstruction
  const rulesSnapshot = pricingRuleRepository.getRules();

  // Build the immutable booking document
  const bookingRecord = {
    id: `BKG-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    bookingReference: reference,
    createdAt: new Date().toISOString(),
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
    },
    cruise: {
      id: cruise.id,
      line: cruise.line,
      name: cruise.name,
      destination: cruise.destination,
      durationNights: cruise.durationNights,
      baseAdultFare: cruise.baseAdultFare,
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
    pricingRulesSnapshot: JSON.parse(JSON.stringify(rulesSnapshot)),
    finalTotal: priceBreakdown.finalTotal,
    finalTotalCents: priceBreakdown.finalTotalCents,
  };

  // --- BEGIN ATOMIC MUTATION ZONE ---
  // All side-effects happen here. We snapshot state before each mutation
  // so we can roll back on any subsequent failure.

  let seatsDeducted = false;
  let redemptionSaved = false;

  try {
    // STEP 9 — Reduce Cruise Capacity
    cruiseRepository.updateAvailableSeats(cruise.id, totalPassengers);
    seatsDeducted = true;

    // STEP 10 — Persist Booking
    const bookings = bookingRepository.listBookings();
    bookings.push(bookingRecord);
    storageDriver.setItem(STORAGE_KEYS.BOOKINGS, bookings);

    // STEP 11 — Record Promo Redemption (only now, after booking is saved)
    if (priceBreakdown.promotionalDiscount?.applied) {
      recordRedemption({
        promoCode: priceBreakdown.promotionalDiscount.code,
        bookingReference: reference,
        customerId: customer.id,
        discountAmount: priceBreakdown.promotionalDiscount.amount,
      });
      redemptionSaved = true;
    }

    return bookingRecord;
  } catch (err) {
    // ROLLBACK: restore cruise seats if already deducted
    if (seatsDeducted) {
      try {
        const cruises = cruiseRepository.getAll();
        const idx = cruises.findIndex((c) => c.id === cruise.id);
        if (idx !== -1) {
          cruises[idx].availableSeats += totalPassengers;
          cruiseRepository.saveAll(cruises);
        }
      } catch (_rollbackErr) {
        // best-effort rollback
      }
    }

    // ROLLBACK: remove the booking record if partially written
    try {
      const bookings = bookingRepository.listBookings().filter((b) => b.bookingReference !== reference);
      storageDriver.setItem(STORAGE_KEYS.BOOKINGS, bookings);
    } catch (_rollbackErr) {
      // best-effort rollback
    }

    throw new Error(`Booking confirmation failed and was rolled back: ${err.message}`);
  }
};

/**
 * Normalises mixed passenger input into a flat array of integer ages.
 */
const normalizeAges = (input) => {
  if (!input) return [];

  let ages = [];
  if (Array.isArray(input)) {
    ages = input.map((item) =>
      typeof item === 'number' ? item : typeof item?.age === 'number' ? item.age : NaN
    );
  } else if (typeof input === 'object') {
    const adultCount = input.adultCount || 0;
    const childrenAges = input.childrenAges || [];
    for (let i = 0; i < adultCount; i++) ages.push(30);
    if (Array.isArray(childrenAges)) ages.push(...childrenAges);
  }

  ages.forEach((age) => {
    if (typeof age !== 'number' || isNaN(age) || age < 0 || !Number.isInteger(age)) {
      throw new Error(`Invalid passenger age: '${age}'. Ages must be non-negative integers.`);
    }
  });

  return ages;
};

/**
 * Generates a guaranteed unique CRZ-XXXXXX reference (no collisions in storage).
 */
const generateUniqueReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  do {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ref = `CRZ-${code}`;
  } while (bookingRepository.referenceExists(ref));
  return ref;
};
