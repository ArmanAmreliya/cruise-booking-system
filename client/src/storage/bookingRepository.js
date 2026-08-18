import { STORAGE_KEYS } from './keys';
import { storageDriver } from './storageDriver';
import { cruiseRepository } from './cruiseRepository';
import { customerRepository } from './customerRepository';
import { pricingRuleRepository } from './pricingRuleRepository';
import { recordRedemption } from '../services/promotionService';
import { calculatePriceBreakdown } from '../services/pricingService';

export const bookingRepository = {
  /**
   * List all confirmed bookings.
   * @returns {Array<Object>}
   */
  listBookings: () => {
    const data = storageDriver.getItem(STORAGE_KEYS.BOOKINGS);
    return data || [];
  },

  /**
   * Alias for listBookings()
   */
  getAll: () => {
    return bookingRepository.listBookings();
  },

  /**
   * Find booking by unique reference (case-insensitive).
   * @param {string} reference
   * @returns {Object|null}
   */
  getBookingByReference: (reference) => {
    if (!reference) return null;
    const bookings = bookingRepository.listBookings();
    const cleanRef = reference.trim().toUpperCase();
    return bookings.find((b) => b.bookingReference.toUpperCase() === cleanRef) || null;
  },

  /**
   * Alias for getBookingByReference()
   */
  getByReference: (reference) => {
    return bookingRepository.getBookingByReference(reference);
  },

  /**
   * Check whether a booking reference already exists.
   * @param {string} reference
   * @returns {boolean}
   */
  referenceExists: (reference) => {
    if (!reference) return false;
    const cleanRef = reference.trim().toUpperCase();
    const bookings = bookingRepository.listBookings();
    return bookings.some((b) => b.bookingReference.toUpperCase() === cleanRef);
  },

  /**
   * Creates and persists a new booking with an immutable financial snapshot.
   *
   * @param {Object} params
   * @param {Object} params.customer - Customer details ({ name, email, phone })
   * @param {Object|string} params.cruise - Selected Cruise or Cruise ID
   * @param {Array} params.passengers - List of passengers or passenger ages
   * @param {Array<string>} [params.selectedOptionalServiceIds=[]] - Selected service IDs
   * @param {string} [params.promoCode=''] - Applied promo code string
   * @param {Object} [params.priceBreakdown] - Pre-calculated breakdown (optional)
   * @param {string} [params.bookingReference] - Custom reference override (optional)
   * @returns {Object} Confirmed booking record
   */
  createBooking: ({
    customer: customerInput,
    cruise: cruiseInput,
    passengers,
    selectedOptionalServiceIds = [],
    promoCode = '',
    priceBreakdown: providedBreakdown = null,
    bookingReference: customReference = null,
  }) => {
    // 1. Resolve Customer
    if (!customerInput || !customerInput.email || !customerInput.name) {
      throw new Error('Valid customer details (name and email) are required for booking.');
    }
    const customer = customerRepository.save(customerInput);

    // 2. Resolve Cruise
    let cruiseId = typeof cruiseInput === 'string' ? cruiseInput : cruiseInput ? cruiseInput.id : null;
    const cruiseDoc = cruiseRepository.getById(cruiseId);

    if (!cruiseDoc) {
      throw new Error(`Cruise with ID '${cruiseId}' not found.`);
    }

    // 3. Compute or Use Price Breakdown
    const priceBreakdown =
      providedBreakdown ||
      calculatePriceBreakdown({
        cruise: cruiseDoc,
        passengers,
        selectedOptionalServiceIds,
        promoCode,
        customerId: customer.id,
      });

    // 4. Validate Capacity
    const passengerCount = priceBreakdown.passengers.totalPassengers;
    if (cruiseDoc.availableSeats < passengerCount) {
      throw new Error(
        `Insufficient capacity on cruise '${cruiseDoc.name}'. Required: ${passengerCount}, Available: ${cruiseDoc.availableSeats}.`
      );
    }

    // 5. Generate Unique Booking Reference
    let reference = customReference ? customReference.toUpperCase() : null;
    if (!reference || bookingRepository.referenceExists(reference)) {
      reference = generateUniqueReference();
    }

    // 6. Capture Current Pricing Rules Snapshot
    const rulesSnapshot = pricingRuleRepository.getRules();

    // 7. Assemble Immutable Booking Document
    const bookingRecord = {
      id: `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingReference: reference,
      createdAt: new Date().toISOString(),
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
      },
      cruise: {
        id: cruiseDoc.id,
        line: cruiseDoc.line,
        name: cruiseDoc.name,
        destination: cruiseDoc.destination,
        durationNights: cruiseDoc.durationNights,
        baseAdultFare: cruiseDoc.baseAdultFare,
      },
      passengers: priceBreakdown.passengers.breakdown,
      passengerCounts: {
        adults: priceBreakdown.passengers.adultCount,
        children: priceBreakdown.passengers.childCount,
        total: priceBreakdown.passengers.totalPassengers,
      },
      selectedOptionalServices: priceBreakdown.optionalServices.items,
      appliedPromotionalCode: priceBreakdown.promotionalDiscount.applied
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

    // 8. Deduct Seat Availability from Cruise Inventory
    cruiseRepository.updateAvailableSeats(cruiseDoc.id, passengerCount);

    // 9. Record Promo Redemption if Applied
    if (priceBreakdown.promotionalDiscount && priceBreakdown.promotionalDiscount.applied) {
      recordRedemption({
        promoCode: priceBreakdown.promotionalDiscount.code,
        bookingReference: reference,
        customerId: customer.id,
        discountAmount: priceBreakdown.promotionalDiscount.amount,
      });
    }

    // 10. Persist Booking
    const bookings = bookingRepository.listBookings();
    bookings.push(bookingRecord);
    storageDriver.setItem(STORAGE_KEYS.BOOKINGS, bookings);

    return bookingRecord;
  },

  /**
   * Reconstructs exact historical pricing snapshot for a confirmed booking.
   * Returns stored financial details proving immutability even after rule changes.
   *
   * @param {string} reference
   * @returns {Object|null}
   */
  reconstructBookingPricing: (reference) => {
    const booking = bookingRepository.getBookingByReference(reference);
    if (!booking) return null;

    return {
      bookingReference: booking.bookingReference,
      createdAt: booking.createdAt,
      cruiseLine: booking.cruise.line,
      cruiseName: booking.cruise.name,
      baseAdultFareAtBooking: booking.cruise.baseAdultFare,
      passengers: booking.passengers,
      optionalServices: booking.selectedOptionalServices,
      appliedPromo: booking.appliedPromotionalCode,
      priceBreakdown: booking.priceBreakdown,
      rulesAtBooking: booking.pricingRulesSnapshot,
      finalTotalCharged: booking.finalTotal,
      finalTotalChargedCents: booking.finalTotalCents,
    };
  },

  /**
   * Clear all bookings (for test teardowns).
   */
  reset: () => {
    storageDriver.setItem(STORAGE_KEYS.BOOKINGS, []);
  },
};

/**
 * Generates a guaranteed unique booking reference in CRZ-XXXXXX format.
 */
const generateUniqueReference = () => {
  let ref = '';
  do {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Readable alphanumeric chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    ref = `CRZ-${code}`;
  } while (bookingRepository.referenceExists(ref));
  return ref;
};
