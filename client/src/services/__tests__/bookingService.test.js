import { describe, it, expect, beforeEach } from 'vitest';
import { confirmBooking } from '../bookingService';
import {
  initLocalStorage,
  cruiseRepository,
  bookingRepository,
  promoRedemptionRepository,
  pricingRuleRepository,
} from '../../storage';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ADULT = { age: 35 };
const CHILD_FREE = { age: 3 };   // 0-4 → 0%
const CHILD_HALF = { age: 8 };   // 5-11 → 50%

const baseParams = () => ({
  customer: { name: 'Test User', email: 'test@example.com', phone: '+1-555-0100' },
  cruise: 'CRZ-101',            // Royal Caribbean, $1200, capacity 12
  passengers: [ADULT],
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Booking Confirmation Service (confirmBooking)', () => {
  beforeEach(() => initLocalStorage(true));

  // ── 1. Successful Booking ─────────────────────────────────────────────────

  describe('1. Successful Booking', () => {
    it('should confirm a booking and return a CRZ-XXXXXX reference', () => {
      const booking = confirmBooking(baseParams());

      expect(booking).not.toBeNull();
      expect(booking.bookingReference).toMatch(/^CRZ-[A-Z0-9]{6}$/);
      expect(booking.customer.email).toBe('test@example.com');
      expect(booking.cruise.name).toBe('Wonder of the Seas');
    });

    it('confirmed booking should appear in bookingRepository', () => {
      const booking = confirmBooking(baseParams());
      const found = bookingRepository.getByReference(booking.bookingReference);
      expect(found).not.toBeNull();
      expect(found.bookingReference).toBe(booking.bookingReference);
    });

    it('confirmed booking should persist all required fields', () => {
      const booking = confirmBooking({
        ...baseParams(),
        passengers: [ADULT, CHILD_HALF],                   // 1 adult + 1 child
        selectedOptionalServiceIds: ['SVC-001'],            // Insurance
      });

      expect(booking.passengers.length).toBe(2);
      expect(booking.passengerCounts.adults).toBe(1);
      expect(booking.passengerCounts.children).toBe(1);
      expect(booking.selectedOptionalServices.length).toBe(1);
      expect(booking.createdAt).toBeDefined();
      expect(booking.pricingRulesSnapshot).toBeDefined();
      expect(booking.pricingRulesSnapshot.taxRate).toBe(0.12);
    });
  });

  // ── 2. Insufficient Capacity ──────────────────────────────────────────────

  describe('2. Capacity Checks', () => {
    it('should throw when passenger count exceeds available seats', () => {
      // CRZ-104 Sky Princess has capacity 2
      expect(() =>
        confirmBooking({
          ...baseParams(),
          cruise: 'CRZ-104',
          passengers: [ADULT, ADULT, ADULT],  // 3 passengers, only 2 seats
        })
      ).toThrow('Insufficient capacity');
    });

    it('should confirm booking that exactly fills remaining capacity', () => {
      // CRZ-104 Sky Princess has exactly 2 seats
      const booking = confirmBooking({
        ...baseParams(),
        cruise: 'CRZ-104',
        passengers: [ADULT, ADULT],
      });
      expect(booking.bookingReference).toMatch(/^CRZ-[A-Z0-9]{6}$/);

      const updatedCruise = cruiseRepository.getById('CRZ-104');
      expect(updatedCruise.availableSeats).toBe(0);
    });
  });

  // ── 3. Sold-Out Cruise ────────────────────────────────────────────────────

  describe('3. Sold-Out Cruise', () => {
    it('should throw for a cruise with 0 available seats (MSC Seascape)', () => {
      expect(() =>
        confirmBooking({
          ...baseParams(),
          cruise: 'CRZ-105',   // MSC Seascape, capacity 0
          passengers: [ADULT],
        })
      ).toThrow('Insufficient capacity');
    });
  });

  // ── 4. Passenger Validation ───────────────────────────────────────────────

  describe('4. Passenger Validation', () => {
    it('should throw when no adult is present (only children)', () => {
      expect(() =>
        confirmBooking({
          ...baseParams(),
          passengers: [CHILD_FREE, CHILD_HALF],
        })
      ).toThrow('At least one adult passenger');
    });

    it('should throw when passenger list is empty', () => {
      expect(() =>
        confirmBooking({ ...baseParams(), passengers: [] })
      ).toThrow('At least one passenger is required');
    });

    it('should throw when customer email is invalid', () => {
      expect(() =>
        confirmBooking({
          ...baseParams(),
          customer: { name: 'Bad User', email: 'not-an-email' },
        })
      ).toThrow('Invalid customer email');
    });

    it('should throw when customer name is missing', () => {
      expect(() =>
        confirmBooking({
          ...baseParams(),
          customer: { name: '', email: 'test@example.com' },
        })
      ).toThrow('Valid customer name and email are required');
    });
  });

  // ── 5. Promotion Redemption ───────────────────────────────────────────────

  describe('5. Promotion Redemption', () => {
    it('should record redemption in promoRedemptionRepository after confirmation', () => {
      const before = promoRedemptionRepository.getAll().length;

      const booking = confirmBooking({
        ...baseParams(),
        passengers: [ADULT],           // $1200 subtotal — meets SUMMER10 $1,000 min
        promoCode: 'SUMMER10',
        currentDate: '2026-07-01',
      });

      const after = promoRedemptionRepository.getAll().length;
      expect(after).toBe(before + 1);

      const redemptions = promoRedemptionRepository.getByPromoCode('SUMMER10');
      expect(redemptions[0].bookingReference).toBe(booking.bookingReference);
    });

    it('should NOT record redemption when no promo code is provided', () => {
      const before = promoRedemptionRepository.getAll().length;
      confirmBooking(baseParams());
      expect(promoRedemptionRepository.getAll().length).toBe(before);
    });

    it('should throw if promo code is supplied but fails validation (expired)', () => {
      expect(() =>
        confirmBooking({
          ...baseParams(),
          promoCode: 'WINTER5',          // Expired 2025-03-31
          currentDate: '2026-07-01',
        })
      ).toThrow('Promotion rejected');
    });
  });

  // ── 6. Capacity Deduction ─────────────────────────────────────────────────

  describe('6. Capacity Deduction After Confirmation', () => {
    it('should reduce availableSeats by total passenger count on confirmation', () => {
      const before = cruiseRepository.getById('CRZ-101').availableSeats;  // 12

      confirmBooking({
        ...baseParams(),
        passengers: [ADULT, ADULT, CHILD_HALF],  // 3 passengers
      });

      const after = cruiseRepository.getById('CRZ-101').availableSeats;
      expect(after).toBe(before - 3);
    });
  });

  // ── 7. Immutable Price Snapshot ───────────────────────────────────────────

  describe('7. Immutable Price Snapshot', () => {
    it('stored finalTotal must exactly equal calculated price shown before confirmation', () => {
      // 1 Adult ($1,200) + 1 Child age 8 ($600) = $1,800 cruise fare
      // Insurance: 2 × $80 = $160
      // Subtotal: $1,960
      // SUMMER10 10% off: −$196  → taxable $1,764
      // 12% tax: $211.68
      // Final: $1,975.68
      const booking = confirmBooking({
        ...baseParams(),
        passengers: [ADULT, CHILD_HALF],
        selectedOptionalServiceIds: ['SVC-001'],
        promoCode: 'SUMMER10',
        currentDate: '2026-07-01',
      });

      expect(booking.finalTotal).toBe(1975.68);
      expect(booking.finalTotalCents).toBe(197568);
      expect(booking.priceBreakdown.cruiseFareSubtotal).toBe(1800);
      expect(booking.priceBreakdown.optionalServices.subtotal).toBe(160);
      expect(booking.priceBreakdown.promotionalDiscount.amount).toBe(196);
      expect(booking.priceBreakdown.tax.amount).toBe(211.68);
    });

    it('historical snapshot must survive later pricing rule changes', () => {
      const booking = confirmBooking({
        ...baseParams(),
        passengers: [ADULT],
      });

      const ref = booking.bookingReference;
      const originalTotal = booking.finalTotal;

      // Mutate pricing rules globally AFTER booking
      pricingRuleRepository.updateRules({ taxRate: 0.25 });

      // Retrieve persisted booking — snapshot must be unchanged
      const persisted = bookingRepository.getByReference(ref);
      expect(persisted.pricingRulesSnapshot.taxRate).toBe(0.12);  // Original
      expect(persisted.finalTotal).toBe(originalTotal);            // Original total
      expect(persisted.priceBreakdown.tax.rate).toBe(0.12);        // Original tax rate
    });
  });

  // ── 8. Rollback / Failure Behaviour ──────────────────────────────────────

  describe('8. Rollback / Failure Behaviour', () => {
    it('should not deduct capacity when validation fails before mutation', () => {
      const before = cruiseRepository.getById('CRZ-105').availableSeats;  // 0

      try {
        confirmBooking({
          ...baseParams(),
          cruise: 'CRZ-105',
          passengers: [ADULT],
        });
      } catch (_) { /* expected */ }

      // Capacity must remain unchanged
      expect(cruiseRepository.getById('CRZ-105').availableSeats).toBe(before);
    });

    it('should not save a partial booking when capacity check fails', () => {
      const before = bookingRepository.listBookings().length;

      try {
        confirmBooking({
          ...baseParams(),
          cruise: 'CRZ-104',          // capacity 2
          passengers: [ADULT, ADULT, ADULT],
        });
      } catch (_) { /* expected */ }

      expect(bookingRepository.listBookings().length).toBe(before);
    });

    it('should not record promo redemption when booking fails validation', () => {
      const before = promoRedemptionRepository.getAll().length;

      try {
        confirmBooking({
          ...baseParams(),
          cruise: 'CRZ-105',         // sold out → will fail
          passengers: [ADULT],
          promoCode: 'SUMMER10',
          currentDate: '2026-07-01',
        });
      } catch (_) { /* expected */ }

      expect(promoRedemptionRepository.getAll().length).toBe(before);
    });
  });
});
