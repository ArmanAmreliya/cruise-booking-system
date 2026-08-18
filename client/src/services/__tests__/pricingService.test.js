import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePriceBreakdown } from '../pricingService';
import { initLocalStorage, pricingRuleRepository } from '../../storage';

describe('Pricing Engine Service (calculatePriceBreakdown)', () => {
  beforeEach(() => {
    initLocalStorage(true);
  });

  describe('1. Child Age Boundaries & Fare Percentages', () => {
    const cruise = 'CRZ-101'; // Royal Caribbean Wonder of the Seas, Base Fare = $1200

    it('Age 0 (Toddler/Infant): should be charged 0% ($0)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 0 }],
      });

      expect(breakdown.passengers.breakdown[1].type).toBe('Child');
      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(0);
      expect(breakdown.passengers.breakdown[1].fare).toBe(0);
      expect(breakdown.cruiseFareSubtotal).toBe(1200); // 1200 + 0
    });

    it('Age 4 (Upper boundary of 0–4 tier): should be charged 0% ($0)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 25 }, { age: 4 }],
      });

      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(0);
      expect(breakdown.passengers.breakdown[1].fare).toBe(0);
    });

    it('Age 5 (Lower boundary of 5–11 tier): should be charged 50% ($600)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 35 }, { age: 5 }],
      });

      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(50);
      expect(breakdown.passengers.breakdown[1].fare).toBe(600);
      expect(breakdown.cruiseFareSubtotal).toBe(1800); // 1200 + 600
    });

    it('Age 11 (Upper boundary of 5–11 tier): should be charged 50% ($600)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 40 }, { age: 11 }],
      });

      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(50);
      expect(breakdown.passengers.breakdown[1].fare).toBe(600);
    });

    it('Age 12 (Lower boundary of 12–17 tier): should be charged 75% ($900)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 45 }, { age: 12 }],
      });

      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(75);
      expect(breakdown.passengers.breakdown[1].fare).toBe(900);
      expect(breakdown.cruiseFareSubtotal).toBe(2100); // 1200 + 900
    });

    it('Age 17 (Upper boundary of 12–17 tier): should be charged 75% ($900)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 45 }, { age: 17 }],
      });

      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(75);
      expect(breakdown.passengers.breakdown[1].fare).toBe(900);
    });

    it('Age 18 (Lower boundary of Adult 18+ tier): should be charged 100% ($1200)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 18 }],
      });

      expect(breakdown.passengers.breakdown[1].type).toBe('Adult');
      expect(breakdown.passengers.breakdown[1].farePercentage).toBe(100);
      expect(breakdown.passengers.breakdown[1].fare).toBe(1200);
      expect(breakdown.cruiseFareSubtotal).toBe(2400); // 1200 + 1200
    });
  });

  describe('2. Group Discount Tiers & Boundaries', () => {
    const cruise = 'CRZ-101'; // Base Fare = $1200 per adult

    it('1 passenger: 0% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }],
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(1);
      expect(breakdown.groupDiscount.discountPercentage).toBe(0);
      expect(breakdown.groupDiscount.amount).toBe(0);
      expect(breakdown.discountedCruiseFare).toBe(1200);
    });

    it('2 passengers: 0% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 28 }],
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(2);
      expect(breakdown.groupDiscount.discountPercentage).toBe(0);
      expect(breakdown.groupDiscount.amount).toBe(0);
      expect(breakdown.discountedCruiseFare).toBe(2400);
    });

    it('3 passengers (Lower boundary 3–4 tier): 5% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 30 }, { age: 30 }], // Subtotal = $3600
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(3);
      expect(breakdown.groupDiscount.discountPercentage).toBe(5);
      expect(breakdown.groupDiscount.amount).toBe(180); // 5% of 3600
      expect(breakdown.discountedCruiseFare).toBe(3420); // 3600 - 180
    });

    it('4 passengers (Upper boundary 3–4 tier): 5% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }], // Subtotal = $4800
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(4);
      expect(breakdown.groupDiscount.discountPercentage).toBe(5);
      expect(breakdown.groupDiscount.amount).toBe(240); // 5% of 4800
      expect(breakdown.discountedCruiseFare).toBe(4560);
    });

    it('5 passengers (Lower boundary 5–6 tier): 10% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }], // Subtotal = $6000
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(5);
      expect(breakdown.groupDiscount.discountPercentage).toBe(10);
      expect(breakdown.groupDiscount.amount).toBe(600); // 10% of 6000
      expect(breakdown.discountedCruiseFare).toBe(5400);
    });

    it('6 passengers (Upper boundary 5–6 tier): 10% group discount', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }, { age: 30 }], // Subtotal = $7200
      });

      expect(breakdown.groupDiscount.passengerCount).toBe(6);
      expect(breakdown.groupDiscount.discountPercentage).toBe(10);
      expect(breakdown.groupDiscount.amount).toBe(720); // 10% of 7200
      expect(breakdown.discountedCruiseFare).toBe(6480);
    });
  });

  describe('3. Optional Services Calculation', () => {
    const cruise = 'CRZ-101'; // 7 nights duration, $1200 base fare

    it('Insurance ($80/passenger) for 2 passengers should equal $160', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 25 }],
        selectedOptionalServiceIds: ['SVC-001'],
      });

      expect(breakdown.optionalServices.items.length).toBe(1);
      expect(breakdown.optionalServices.items[0].name).toBe('Insurance');
      expect(breakdown.optionalServices.items[0].totalCost).toBe(160);
      expect(breakdown.optionalServices.subtotal).toBe(160);
    });

    it('Wi-Fi ($15/passenger/night) for 2 passengers on 7-night cruise should equal $210', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 25 }],
        selectedOptionalServiceIds: ['SVC-002'],
      });

      // 15 * 2 passengers * 7 nights = 210
      expect(breakdown.optionalServices.items[0].name).toBe('Wi-Fi');
      expect(breakdown.optionalServices.items[0].totalCost).toBe(210);
      expect(breakdown.optionalServices.subtotal).toBe(210);
    });

    it('Shore Excursion ($120/passenger) for 2 passengers should equal $240', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 25 }],
        selectedOptionalServiceIds: ['SVC-003'],
      });

      expect(breakdown.optionalServices.items[0].name).toBe('Shore Excursion');
      expect(breakdown.optionalServices.items[0].totalCost).toBe(240);
    });

    it('Multiple optional services selected together', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 25 }], // 2 passengers, 7 nights
        selectedOptionalServiceIds: ['SVC-001', 'SVC-002', 'SVC-003'],
      });

      // Insurance: $160 + Wi-Fi: $210 + Shore Excursion: $240 = $610
      expect(breakdown.optionalServices.subtotal).toBe(610);
    });
  });

  describe('4. Promotional Codes & Dynamic Validation', () => {
    const cruise = 'CRZ-101'; // $1200 base

    it('SUMMER10 (10% off) applied when min spend ($1,000) is met', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }], // Subtotal = $1200
        promoCode: 'SUMMER10',
        currentDate: '2026-07-01',
      });

      expect(breakdown.promotionalDiscount.applied).toBe(true);
      expect(breakdown.promotionalDiscount.discountType).toBe('PERCENTAGE');
      expect(breakdown.promotionalDiscount.amount).toBe(120); // 10% of 1200
      expect(breakdown.taxableAmount).toBe(1080); // 1200 - 120
    });

    it('SUMMER10 should fail if pre-discount subtotal is below min spend ($1,000)', () => {
      const breakdown = calculatePriceBreakdown({
        cruise: 'CRZ-103', // Base Fare = $950
        passengers: [{ age: 30 }, { age: 2 }], // 1 Adult ($950) + 1 Child 2 yrs ($0) = $950
        promoCode: 'SUMMER10',
        currentDate: '2026-07-01',
      });

      expect(breakdown.promotionalDiscount.applied).toBe(false);
      expect(breakdown.promotionalDiscount.message).toContain('Minimum spend of $1,000 required');
      expect(breakdown.promotionalDiscount.amount).toBe(0);
    });

    it('FIRST150 ($150 fixed discount) applied when min spend ($2,000) is met', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }, { age: 30 }], // Subtotal = $2400
        promoCode: 'FIRST150',
        currentDate: '2026-05-01',
      });

      expect(breakdown.promotionalDiscount.applied).toBe(true);
      expect(breakdown.promotionalDiscount.amount).toBe(150);
      expect(breakdown.taxableAmount).toBe(2250); // 2400 - 150
    });

    it('Expired promo code WINTER5 should be rejected', () => {
      const breakdown = calculatePriceBreakdown({
        cruise,
        passengers: [{ age: 30 }],
        promoCode: 'WINTER5',
        currentDate: '2026-05-01', // Expired on 2025-03-31
      });

      expect(breakdown.promotionalDiscount.applied).toBe(false);
      expect(breakdown.promotionalDiscount.message).toContain('expired on');
    });
  });

  describe('5. Mandatory 12% Tax & Grand Total Integrity', () => {
    it('should calculate exact 12% tax on taxable amount and match final total', () => {
      const breakdown = calculatePriceBreakdown({
        cruise: 'CRZ-101', // $1200
        passengers: [{ age: 30 }, { age: 8 }], // 1200 + 600 = $1800
        selectedOptionalServiceIds: ['SVC-001'], // +$160 = $1960
        promoCode: 'SUMMER10', // -10% (-$196) = $1764 taxable
        currentDate: '2026-07-01',
      });

      expect(breakdown.cruiseFareSubtotal).toBe(1800);
      expect(breakdown.optionalServices.subtotal).toBe(160);
      expect(breakdown.preDiscountSubtotal).toBe(1960);
      expect(breakdown.promotionalDiscount.amount).toBe(196);
      expect(breakdown.taxableAmount).toBe(1764);

      // Tax = 12% of 1764 = $211.68
      expect(breakdown.tax.rate).toBe(0.12);
      expect(breakdown.tax.amount).toBe(211.68);
      expect(breakdown.tax.amountCents).toBe(21168);

      // Final Total = 1764 + 211.68 = $1975.68
      expect(breakdown.finalTotal).toBe(1975.68);
      expect(breakdown.finalTotalCents).toBe(197568);
    });
  });

  describe('6. Dynamic Configuration Rule Evaluation', () => {
    it('should dynamically apply updated tax rate when pricing rules are changed in localStorage', () => {
      pricingRuleRepository.updateRules({ taxRate: 0.15 });

      const breakdown = calculatePriceBreakdown({
        cruise: 'CRZ-101',
        passengers: [{ age: 30 }], // $1200
      });

      expect(breakdown.tax.rate).toBe(0.15);
      expect(breakdown.tax.amount).toBe(180); // 15% of 1200
      expect(breakdown.finalTotal).toBe(1380); // 1200 + 180
    });
  });

  describe('7. Invalid Input & Boundary Error Validation', () => {
    it('should throw error if zero adults are present', () => {
      expect(() =>
        calculatePriceBreakdown({
          cruise: 'CRZ-101',
          passengers: [{ age: 10 }, { age: 12 }],
        })
      ).toThrow('At least one adult passenger (age 18+) is required.');
    });

    it('should throw error if passenger array is empty', () => {
      expect(() =>
        calculatePriceBreakdown({
          cruise: 'CRZ-101',
          passengers: [],
        })
      ).toThrow('At least one adult passenger (age 18+) is required.');
    });

    it('should throw error for negative passenger age', () => {
      expect(() =>
        calculatePriceBreakdown({
          cruise: 'CRZ-101',
          passengers: [{ age: 30 }, { age: -5 }],
        })
      ).toThrow("Invalid passenger age: '-5'. Age must be a non-negative integer.");
    });

    it('should throw error for non-integer passenger age', () => {
      expect(() =>
        calculatePriceBreakdown({
          cruise: 'CRZ-101',
          passengers: [{ age: 30 }, { age: 5.5 }],
        })
      ).toThrow("Invalid passenger age: '5.5'. Age must be a non-negative integer.");
    });

    it('should throw error if invalid cruise selection is passed', () => {
      expect(() =>
        calculatePriceBreakdown({
          cruise: 'INVALID-CRUISE-ID',
          passengers: [{ age: 30 }],
        })
      ).toThrow('Valid cruise selection is required.');
    });
  });
});
