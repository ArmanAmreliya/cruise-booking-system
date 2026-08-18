import { describe, it, expect, beforeEach } from 'vitest';
import {
  findPromotion,
  validatePromotion,
  calculateDiscount,
  recordRedemption,
} from '../promotionService';
import { initLocalStorage, promoRedemptionRepository } from '../../storage';

describe('Promotion Service (Validation & Redemption)', () => {
  beforeEach(() => {
    initLocalStorage(true);
  });

  describe('1. Code Lookup (findPromotion)', () => {
    it('should find active promotion case-insensitively', () => {
      const promo = findPromotion('summer10');
      expect(promo).not.toBeNull();
      expect(promo.code).toBe('SUMMER10');
      expect(promo.discountType).toBe('PERCENTAGE');
    });

    it('should return null for non-existent promotion code', () => {
      const promo = findPromotion('INVALID_XYZ');
      expect(promo).toBeNull();
    });
  });

  describe('2. Promotion Validation Scenarios', () => {
    it('Valid code (SUMMER10 on valid date with minimum spend met)', () => {
      const res = validatePromotion({
        promoCode: 'SUMMER10',
        preDiscountSubtotal: 1200,
        currentDate: '2026-07-15',
      });

      expect(res.valid).toBe(true);
      expect(res.code).toBe('SUMMER10');
      expect(res.discountType).toBe('PERCENTAGE');
      expect(res.discountValue).toBe(10);
      expect(res.discountAmount).toBe(120);
      expect(res.error).toBeNull();
    });

    it('Invalid code should return invalid result with message', () => {
      const res = validatePromotion({
        promoCode: 'UNKNOWN_99',
        preDiscountSubtotal: 1500,
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain("does not exist");
      expect(res.discountAmount).toBe(0);
    });

    it('Expired code (WINTER5 checked on 2026-05-01)', () => {
      const res = validatePromotion({
        promoCode: 'WINTER5',
        preDiscountSubtotal: 1500,
        currentDate: '2026-05-01',
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('expired');
    });

    it('Not-yet-valid code (SUMMER10 checked on 2026-05-15)', () => {
      const res = validatePromotion({
        promoCode: 'SUMMER10',
        preDiscountSubtotal: 1500,
        currentDate: '2026-05-15', // Starts 2026-06-01
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('not valid until');
    });
  });

  describe('3. Exact validFrom/validTo Date Boundaries', () => {
    const promoCode = 'SUMMER10'; // Valid from 2026-06-01 to 2026-08-31

    it('On exact start date (2026-06-01): should be valid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1200,
        currentDate: '2026-06-01',
      });
      expect(res.valid).toBe(true);
    });

    it('On exact end date (2026-08-31): should be valid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1200,
        currentDate: '2026-08-31',
      });
      expect(res.valid).toBe(true);
    });

    it('1 day before start date (2026-05-31): should be invalid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1200,
        currentDate: '2026-05-31',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('not valid until');
    });

    it('1 day after end date (2026-09-01): should be invalid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1200,
        currentDate: '2026-09-01',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('expired');
    });
  });

  describe('4. Minimum Spend Thresholds', () => {
    const promoCode = 'SUMMER10'; // minSpend = $1,000

    it('Minimum spend exactly met ($1,000.00): should be valid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1000,
        currentDate: '2026-07-01',
      });
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(100);
    });

    it('Minimum spend not met ($999.99): should be invalid', () => {
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 999.99,
        currentDate: '2026-07-01',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Minimum spend of $1,000 required');
    });
  });

  describe('5. Discount Types (Percentage & Fixed)', () => {
    it('Percentage discount calculation (SUMMER10: 10% of $2,500 = $250)', () => {
      const promo = findPromotion('SUMMER10');
      const calc = calculateDiscount(promo, 2500);
      expect(calc.discountAmount).toBe(250);
      expect(calc.discountAmountCents).toBe(25000);
    });

    it('Fixed discount calculation (FIRST150: $150 fixed off $3,000)', () => {
      const promo = findPromotion('FIRST150');
      const calc = calculateDiscount(promo, 3000);
      expect(calc.discountAmount).toBe(150);
      expect(calc.discountAmountCents).toBe(15000);
    });

    it('Fixed discount capped at subtotal if subtotal < fixed discount value', () => {
      const promo = { discountType: 'FIXED', value: 150 };
      const calc = calculateDiscount(promo, 100); // subtotal $100
      expect(calc.discountAmount).toBe(100);
    });
  });

  describe('6. Maximum Usage Limits (Total & Per Customer)', () => {
    it('Maximum total usage limit reached (CREW25 max 3 total)', () => {
      const promoCode = 'CREW25';

      // Record 3 redemptions
      recordRedemption({ promoCode, bookingReference: 'REF-001', customerId: 'CUST-A' });
      recordRedemption({ promoCode, bookingReference: 'REF-002', customerId: 'CUST-B' });
      recordRedemption({ promoCode, bookingReference: 'REF-003', customerId: 'CUST-C' });

      // Attempt 4th redemption validation
      const res = validatePromotion({
        promoCode,
        preDiscountSubtotal: 1000,
        currentDate: '2026-07-01',
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('maximum total redemptions limit (3)');
    });

    it('Maximum per-customer usage limit reached (FIRST150 max 1 per customer)', () => {
      const promoCode = 'FIRST150';

      // Customer 1 redeems promo
      recordRedemption({ promoCode, bookingReference: 'REF-101', customerId: 'CUST-001', discountAmount: 150 });

      // Customer 1 attempts 2nd use -> invalid
      const resCust1 = validatePromotion({
        promoCode,
        customerId: 'CUST-001',
        preDiscountSubtotal: 2500,
        currentDate: '2026-07-01',
      });
      expect(resCust1.valid).toBe(false);
      expect(resCust1.error).toContain('Customer limit reached (1)');

      // Customer 2 attempts 1st use -> valid!
      const resCust2 = validatePromotion({
        promoCode,
        customerId: 'CUST-002',
        preDiscountSubtotal: 2500,
        currentDate: '2026-07-01',
      });
      expect(resCust2.valid).toBe(true);
    });
  });

  describe('7. One-Code-Per-Booking Rule', () => {
    it('should reject attempt with multiple promo codes in string', () => {
      const res = validatePromotion({
        promoCode: 'SUMMER10, FIRST150',
        preDiscountSubtotal: 3000,
        currentDate: '2026-07-01',
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Only one promotional code can be applied per booking');
    });

    it('should reject attempt with array of multiple promo codes', () => {
      const res = validatePromotion({
        promoCode: ['SUMMER10', 'CREW25'],
        preDiscountSubtotal: 3000,
        currentDate: '2026-07-01',
      });

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Only one promotional code can be applied per booking');
    });
  });

  describe('8. Quotation Non-Consumption & Confirmation Redemption', () => {
    it('Quotation/Validation does NOT consume redemptions in localStorage', () => {
      const initialRedemptions = promoRedemptionRepository.getAll().length;

      validatePromotion({
        promoCode: 'SUMMER10',
        customerId: 'CUST-001',
        preDiscountSubtotal: 2000,
        currentDate: '2026-07-01',
      });

      const afterValidationRedemptions = promoRedemptionRepository.getAll().length;
      expect(afterValidationRedemptions).toBe(initialRedemptions); // Unchanged!
    });

    it('recordRedemption DOES save redemption entry only on confirmation', () => {
      const initialRedemptions = promoRedemptionRepository.getAll().length;

      const record = recordRedemption({
        promoCode: 'SUMMER10',
        bookingReference: 'CRZ-CONFIRM01',
        customerId: 'CUST-001',
        discountAmount: 200,
      });

      expect(record.id).toBeDefined();
      expect(record.promoCode).toBe('SUMMER10');
      expect(record.bookingReference).toBe('CRZ-CONFIRM01');

      const afterRecordRedemptions = promoRedemptionRepository.getAll().length;
      expect(afterRecordRedemptions).toBe(initialRedemptions + 1);
    });
  });
});
