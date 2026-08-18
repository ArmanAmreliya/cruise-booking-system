import { describe, it, expect, beforeEach } from 'vitest';
import { bookingRepository } from '../bookingRepository';
import { cruiseRepository } from '../cruiseRepository';
import { pricingRuleRepository } from '../pricingRuleRepository';
import { promoRedemptionRepository } from '../promoRedemptionRepository';
import { initLocalStorage } from '../index';

describe('Booking Repository & Historical Immutability', () => {
  beforeEach(() => {
    initLocalStorage(true);
  });

  describe('1. Creating a Booking', () => {
    it('should create a confirmed booking with customer, cruise, passengers, and financial breakdown', () => {
      const booking = bookingRepository.createBooking({
        customer: { name: 'Alice Smith', email: 'alice@example.com', phone: '+1-555-0123' },
        cruise: 'CRZ-101', // Royal Caribbean, $1200 base
        passengers: [{ age: 35 }, { age: 8 }], // 1 Adult + 1 Child (50% = $600) -> $1800 subtotal
        selectedOptionalServiceIds: ['SVC-001'], // Insurance: $160 -> $1960 subtotal
        promoCode: 'SUMMER10', // -10% (-$196) -> $1764 taxable -> +12% tax ($211.68) -> $1975.68
      });

      expect(booking).not.toBeNull();
      expect(booking.id).toBeDefined();
      expect(booking.bookingReference).toMatch(/^CRZ-[A-Z0-9]{6}$/);
      expect(booking.customer.name).toBe('Alice Smith');
      expect(booking.customer.email).toBe('alice@example.com');
      expect(booking.cruise.name).toBe('Wonder of the Seas');
      expect(booking.passengers.length).toBe(2);
      expect(booking.selectedOptionalServices.length).toBe(1);
      expect(booking.appliedPromotionalCode.code).toBe('SUMMER10');
      expect(booking.finalTotal).toBe(1975.68);
      expect(booking.finalTotalCents).toBe(197568);
    });

    it('should deduct seat capacity from cruise inventory upon confirmation', () => {
      const initialCruise = cruiseRepository.getById('CRZ-101');
      expect(initialCruise.availableSeats).toBe(12);

      bookingRepository.createBooking({
        customer: { name: 'Bob Jones', email: 'bob@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 40 }, { age: 30 }], // 2 passengers
      });

      const updatedCruise = cruiseRepository.getById('CRZ-101');
      expect(updatedCruise.availableSeats).toBe(10); // 12 - 2 = 10
    });

    it('should record promo redemption entry upon booking confirmation', () => {
      const initialRedemptions = promoRedemptionRepository.getAll().length;

      const booking = bookingRepository.createBooking({
        customer: { name: 'Charlie', email: 'charlie@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
        promoCode: 'SUMMER10',
      });

      const redemptions = promoRedemptionRepository.getByPromoCode('SUMMER10');
      expect(redemptions.length).toBe(initialRedemptions + 1);
      expect(redemptions[0].bookingReference).toBe(booking.bookingReference);
    });
  });

  describe('2. Unique Booking References & Existence Check', () => {
    it('should generate unique references for multiple bookings', () => {
      const b1 = bookingRepository.createBooking({
        customer: { name: 'User 1', email: 'user1@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
      });

      const b2 = bookingRepository.createBooking({
        customer: { name: 'User 2', email: 'user2@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
      });

      expect(b1.bookingReference).not.toEqual(b2.bookingReference);
      expect(bookingRepository.referenceExists(b1.bookingReference)).toBe(true);
      expect(bookingRepository.referenceExists(b2.bookingReference)).toBe(true);
      expect(bookingRepository.referenceExists('CRZ-NONEXISTENT')).toBe(false);
    });

    it('referenceExists should be case-insensitive', () => {
      const b = bookingRepository.createBooking({
        customer: { name: 'User 3', email: 'user3@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
      });

      const refLower = b.bookingReference.toLowerCase();
      expect(bookingRepository.referenceExists(refLower)).toBe(true);
    });
  });

  describe('3. Retrieving Bookings', () => {
    it('should fetch booking by reference', () => {
      const b = bookingRepository.createBooking({
        customer: { name: 'David', email: 'david@example.com' },
        cruise: 'CRZ-102', // Celebrity Beyond
        passengers: [{ age: 35 }],
      });

      const fetched = bookingRepository.getBookingByReference(b.bookingReference);
      expect(fetched).not.toBeNull();
      expect(fetched.customer.name).toBe('David');
      expect(fetched.cruise.name).toBe('Celebrity Beyond');
    });

    it('should return null for non-existent booking reference', () => {
      const fetched = bookingRepository.getBookingByReference('CRZ-999999');
      expect(fetched).toBeNull();
    });

    it('listBookings should return all created bookings', () => {
      expect(bookingRepository.listBookings().length).toBe(0);

      bookingRepository.createBooking({
        customer: { name: 'E1', email: 'e1@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
      });

      bookingRepository.createBooking({
        customer: { name: 'E2', email: 'e2@example.com' },
        cruise: 'CRZ-102',
        passengers: [{ age: 30 }],
      });

      expect(bookingRepository.listBookings().length).toBe(2);
    });
  });

  describe('4. Historical Pricing Preservation & Immutability', () => {
    it('should permanently preserve original pricing snapshot even if current pricing rules change in future', () => {
      // Step A: Create a booking with current catalog price ($1200) and current 12% tax
      const booking = bookingRepository.createBooking({
        customer: { name: 'Frank', email: 'frank@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }, { age: 8 }], // $1800 subtotal
        selectedOptionalServiceIds: ['SVC-001'], // +$160 = $1960
        promoCode: 'SUMMER10', // -$196 = $1764 taxable + 12% tax ($211.68) = $1975.68
      });

      const originalRef = booking.bookingReference;
      const originalTotal = booking.finalTotal; // $1975.68
      const originalTax = booking.priceBreakdown.tax.amount; // $211.68

      // Step B: Mutate global pricing rules in localStorage (e.g. increase tax rate to 25%)
      pricingRuleRepository.updateRules({ taxRate: 0.25 });

      // Step C: Mutate cruise catalog price in localStorage (e.g. increase base fare to $5,000)
      const allCruises = cruiseRepository.getAll();
      allCruises[0].baseAdultFare = 5000;
      cruiseRepository.saveAll(allCruises);

      // Step D: Retrieve historical booking and reconstruct pricing
      const reconstructed = bookingRepository.reconstructBookingPricing(originalRef);

      expect(reconstructed).not.toBeNull();
      // Base fare at booking must still be $1200
      expect(reconstructed.baseAdultFareAtBooking).toBe(1200);
      // Tax rate at booking must still be 12% (0.12)
      expect(reconstructed.rulesAtBooking.taxRate).toBe(0.12);
      // Tax amount must still be $211.68
      expect(reconstructed.priceBreakdown.tax.amount).toBe(211.68);
      // Final total charged must remain 100% UNCHANGED at $1975.68
      expect(reconstructed.finalTotalCharged).toBe(originalTotal);
    });
  });
});
