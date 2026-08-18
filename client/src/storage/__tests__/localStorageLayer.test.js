import { describe, it, expect, beforeEach } from 'vitest';
import {
  initLocalStorage,
  cruiseRepository,
  promoCodeRepository,
  pricingRuleRepository,
  optionalServiceRepository,
  customerRepository,
  bookingRepository,
  promoRedemptionRepository,
} from '../index';

describe('Local Storage Data Layer Repositories (Corrected Business Rules)', () => {
  beforeEach(() => {
    initLocalStorage(true);
  });

  describe('1. Cruise Repository', () => {
    it('should return all 5 seed cruises', () => {
      const cruises = cruiseRepository.getAll();
      expect(cruises.length).toBe(5);
      expect(cruises[0].id).toBe('CRZ-101');
      expect(cruises[0].line).toBe('Royal Caribbean');
      expect(cruises[0].name).toBe('Wonder of the Seas');
      expect(cruises[0].baseAdultFare).toBe(1200);
      expect(cruises[0].capacity).toBe(12);
    });

    it('should correctly include sold out cruise (capacity 0)', () => {
      const soldOutCruise = cruiseRepository.getById('CRZ-105');
      expect(soldOutCruise).not.toBeNull();
      expect(soldOutCruise.name).toBe('MSC Seascape');
      expect(soldOutCruise.capacity).toBe(0);
      expect(soldOutCruise.availableSeats).toBe(0);
    });

    it('should update available seats when booking seats', () => {
      const updated = cruiseRepository.updateAvailableSeats('CRZ-101', 2);
      expect(updated.availableSeats).toBe(10);
    });

    it('should throw error if seats requested exceed available capacity', () => {
      expect(() => cruiseRepository.updateAvailableSeats('CRZ-104', 5)).toThrow(
        'Insufficient seats available on cruise CRZ-104'
      );
    });
  });

  describe('2. Promo Code Repository', () => {
    it('should retrieve all 4 seed promo codes', () => {
      const codes = promoCodeRepository.getAll();
      expect(codes.length).toBe(4);
      expect(codes.map((c) => c.code)).toEqual(['SUMMER10', 'FIRST150', 'CREW25', 'WINTER5']);
    });

    it('should fetch promo code case-insensitively with correct rules', () => {
      const summer10 = promoCodeRepository.getByCode('summer10');
      expect(summer10).not.toBeNull();
      expect(summer10.discountType).toBe('PERCENTAGE');
      expect(summer10.value).toBe(10);
      expect(summer10.minSpend).toBe(1000);

      const first150 = promoCodeRepository.getByCode('FIRST150');
      expect(first150.discountType).toBe('FIXED');
      expect(first150.value).toBe(150);
      expect(first150.minSpend).toBe(2000);
    });

    it('should return null for non-existent promo code', () => {
      const promo = promoCodeRepository.getByCode('INVALID99');
      expect(promo).toBeNull();
    });
  });

  describe('3. Pricing Rule Repository', () => {
    it('should return exact tax rate (12%), child age rules, and group discounts', () => {
      const rules = pricingRuleRepository.getRules();
      expect(rules.taxRate).toBe(0.12);

      // Child age rules check
      expect(rules.childAgeRules.length).toBe(4);
      expect(rules.childAgeRules[0]).toEqual({ minAge: 0, maxAge: 4, farePercentage: 0, label: 'Toddler/Infant (0-4 yrs): 0% fare' });
      expect(rules.childAgeRules[1]).toEqual({ minAge: 5, maxAge: 11, farePercentage: 50, label: 'Child (5-11 yrs): 50% fare' });
      expect(rules.childAgeRules[2]).toEqual({ minAge: 12, maxAge: 17, farePercentage: 75, label: 'Teen (12-17 yrs): 75% fare' });
      expect(rules.childAgeRules[3]).toEqual({ minAge: 18, maxAge: 120, farePercentage: 100, label: 'Adult (18+ yrs): 100% fare' });

      // Group discount rules check
      expect(rules.groupDiscountRules.length).toBe(3);
      expect(rules.groupDiscountRules[0].discountPercentage).toBe(0); // 1-2 passengers
      expect(rules.groupDiscountRules[1].discountPercentage).toBe(5); // 3-4 passengers
      expect(rules.groupDiscountRules[2].discountPercentage).toBe(10); // 5-6 passengers
    });

    it('should update pricing rules without code redeployment', () => {
      pricingRuleRepository.updateRules({ taxRate: 0.15 });
      const updated = pricingRuleRepository.getRules();
      expect(updated.taxRate).toBe(0.15);
    });
  });

  describe('4. Optional Service Repository', () => {
    it('should retrieve all 3 exact optional services', () => {
      const services = optionalServiceRepository.getAll();
      expect(services.length).toBe(3);
      expect(services[0]).toEqual({
        id: 'SVC-001',
        name: 'Insurance',
        price: 80,
        billingModel: 'per_passenger',
        description: 'Full travel protection ($80 per passenger)',
      });
      expect(services[1]).toEqual({
        id: 'SVC-002',
        name: 'Wi-Fi',
        price: 15,
        billingModel: 'per_passenger_per_night',
        description: 'High-speed Wi-Fi ($15 per passenger per night)',
      });
      expect(services[2]).toEqual({
        id: 'SVC-003',
        name: 'Shore Excursion',
        price: 120,
        billingModel: 'per_passenger',
        description: 'Guided shore tours pass ($120 per passenger)',
      });
    });

    it('should get services by list of IDs', () => {
      const selected = optionalServiceRepository.getByIds(['SVC-001', 'SVC-003']);
      expect(selected.length).toBe(2);
      expect(selected.map((s) => s.name)).toEqual(['Insurance', 'Shore Excursion']);
    });
  });

  describe('5. Customer Repository', () => {
    it('should save and retrieve customer', () => {
      const newCustomer = customerRepository.save({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1-555-0200',
      });
      expect(newCustomer.id).toBeDefined();

      const fetched = customerRepository.getByEmail('jane@example.com');
      expect(fetched.name).toBe('Jane Smith');
    });
  });

  describe('6. Booking Repository', () => {
    it('should create booking and generate unique reference', () => {
      const booking = bookingRepository.createBooking({
        customer: { name: 'Test User', email: 'test@example.com' },
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }],
      });

      expect(booking.id).toBeDefined();
      expect(booking.bookingReference).toMatch(/^CRZ-[A-Z0-9]{6}$/);

      const retrieved = bookingRepository.getByReference(booking.bookingReference);
      expect(retrieved.customer.email).toBe('test@example.com');
      expect(retrieved.cruise.name).toBe('Wonder of the Seas');
    });
  });

  describe('7. Promo Redemption Repository', () => {
    it('should save and track promo redemptions', () => {
      promoRedemptionRepository.saveRedemption({
        promoCode: 'SUMMER10',
        bookingReference: 'CRZ-TEST01',
        discountAmount: 120,
      });

      const redemptions = promoRedemptionRepository.getByPromoCode('SUMMER10');
      expect(redemptions.length).toBe(1);
      expect(redemptions[0].bookingReference).toBe('CRZ-TEST01');
    });
  });
});
