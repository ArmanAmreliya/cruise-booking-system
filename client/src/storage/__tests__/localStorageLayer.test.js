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
  storageDriver,
} from '../index';

describe('Local Storage Data Layer Repositories', () => {
  beforeEach(() => {
    initLocalStorage(true);
  });

  describe('1. Cruise Repository', () => {
    it('should return all seed cruises', () => {
      const cruises = cruiseRepository.getAll();
      expect(cruises.length).toBe(3);
      expect(cruises[0].id).toBe('CRZ-101');
      expect(cruises[0].baseAdultFare).toBe(800);
    });

    it('should find cruise by id', () => {
      const cruise = cruiseRepository.getById('CRZ-102');
      expect(cruise).not.toBeNull();
      expect(cruise.name).toBe('Mediterranean Discovery Voyage');
    });

    it('should update available seats', () => {
      const updated = cruiseRepository.updateAvailableSeats('CRZ-101', 5);
      expect(updated.availableSeats).toBe(45);
    });

    it('should throw error if seats requested exceed available capacity', () => {
      expect(() => cruiseRepository.updateAvailableSeats('CRZ-103', 100)).toThrow(
        'Insufficient seats available on cruise CRZ-103'
      );
    });
  });

  describe('2. Promo Code Repository', () => {
    it('should retrieve seed promo codes', () => {
      const codes = promoCodeRepository.getAll();
      expect(codes.length).toBe(3);
      expect(codes.map((c) => c.code)).toContain('WELCOME10');
    });

    it('should fetch promo code case-insensitively', () => {
      const promo = promoCodeRepository.getByCode('welcome10');
      expect(promo).not.toBeNull();
      expect(promo.discountType).toBe('PERCENTAGE');
      expect(promo.value).toBe(10);
    });

    it('should return null for non-existent promo code', () => {
      const promo = promoCodeRepository.getByCode('INVALID99');
      expect(promo).toBeNull();
    });
  });

  describe('3. Pricing Rule Repository', () => {
    it('should return 12% tax rate and child/group rules', () => {
      const rules = pricingRuleRepository.getRules();
      expect(rules.taxRate).toBe(0.12);
      expect(rules.childAgeRules.length).toBe(3);
      expect(rules.groupDiscountRule.minPassengers).toBe(5);
    });

    it('should update pricing rules without code change', () => {
      pricingRuleRepository.updateRules({ taxRate: 0.15 });
      const updated = pricingRuleRepository.getRules();
      expect(updated.taxRate).toBe(0.15);
    });
  });

  describe('4. Optional Service Repository', () => {
    it('should retrieve all optional services', () => {
      const services = optionalServiceRepository.getAll();
      expect(services.length).toBe(4);
      expect(services[0].id).toBe('SVC-001');
    });

    it('should get services by list of IDs', () => {
      const selected = optionalServiceRepository.getByIds(['SVC-001', 'SVC-003']);
      expect(selected.length).toBe(2);
      expect(selected.map((s) => s.id)).toEqual(['SVC-001', 'SVC-003']);
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
    it('should save booking and generate unique reference', () => {
      const booking = bookingRepository.save({
        cruiseId: 'CRZ-101',
        totalPrice: 1500,
      });

      expect(booking.id).toBeDefined();
      expect(booking.bookingReference).toMatch(/^CRZ-[A-Z0-9]{6}$/);

      const retrieved = bookingRepository.getByReference(booking.bookingReference);
      expect(retrieved.totalPrice).toBe(1500);
    });
  });

  describe('7. Promo Redemption Repository', () => {
    it('should save and track promo redemptions', () => {
      promoRedemptionRepository.saveRedemption({
        promoCode: 'WELCOME10',
        bookingReference: 'CRZ-TEST01',
        discountAmount: 80,
      });

      const redemptions = promoRedemptionRepository.getByPromoCode('WELCOME10');
      expect(redemptions.length).toBe(1);
      expect(redemptions[0].bookingReference).toBe('CRZ-TEST01');
    });
  });
});
