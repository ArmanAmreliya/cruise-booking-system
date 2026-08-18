import { cruiseRepository } from '../storage/cruiseRepository';
import { pricingRuleRepository } from '../storage/pricingRuleRepository';
import { optionalServiceRepository } from '../storage/optionalServiceRepository';
import { promoCodeRepository } from '../storage/promoCodeRepository';
import { promoRedemptionRepository } from '../storage/promoRedemptionRepository';

/**
 * Calculates a complete, itemized price breakdown for a cruise booking.
 * All monetary calculations inside use integer cents to eliminate floating-point rounding errors.
 *
 * @param {Object} params
 * @param {Object|string} params.cruise - Cruise object or Cruise ID
 * @param {Array<number>|Array<{age: number}>|{adultCount: number, childrenAges: Array<number>}} params.passengers - Passenger specifications
 * @param {Array<string>} [params.selectedOptionalServiceIds=[]] - IDs of selected optional services
 * @param {string} [params.promoCode=''] - Promotional code string
 * @param {string} [params.currentDate] - Optional date override for promo validation (ISO string 'YYYY-MM-DD')
 * @returns {Object} Complete price breakdown object with values in dollars and integer cents
 */
export const calculatePriceBreakdown = ({
  cruise: cruiseInput,
  passengers: passengerInput,
  selectedOptionalServiceIds = [],
  promoCode = '',
  currentDate = new Date().toISOString().split('T')[0],
}) => {
  // 1. Resolve Cruise Document
  let cruise = null;
  if (typeof cruiseInput === 'string') {
    cruise = cruiseRepository.getById(cruiseInput);
  } else if (cruiseInput && cruiseInput.id) {
    cruise = cruiseRepository.getById(cruiseInput.id) || cruiseInput;
  }

  if (!cruise || !cruise.baseAdultFare) {
    throw new Error('Valid cruise selection is required.');
  }

  // 2. Normalize and Validate Passengers & Ages
  const normalizedAges = parsePassengerAges(passengerInput);

  if (normalizedAges.length === 0) {
    throw new Error('At least one adult passenger (age 18+) is required.');
  }

  const adultAges = normalizedAges.filter((age) => age >= 18);
  const childrenAges = normalizedAges.filter((age) => age < 18);

  if (adultAges.length === 0) {
    throw new Error('At least one adult passenger (age 18+) is required.');
  }

  const totalPassengers = normalizedAges.length;

  // 3. Fetch Pricing Rules from LocalStorage Repository
  const pricingRules = pricingRuleRepository.getRules();
  const baseAdultFareCents = Math.round(cruise.baseAdultFare * 100);

  // 4. Calculate Individual Passenger Fares
  const passengerBreakdown = normalizedAges.map((age) => {
    const isAdult = age >= 18;
    const rule = matchChildRule(age, pricingRules.childAgeRules);
    const farePercentage = isAdult ? 100 : rule ? rule.farePercentage : 100;
    const fareCents = Math.round(baseAdultFareCents * (farePercentage / 100));

    return {
      type: isAdult ? 'Adult' : 'Child',
      age,
      farePercentage,
      fareCents,
      fare: centsToDollars(fareCents),
    };
  });

  const cruiseFareSubtotalCents = passengerBreakdown.reduce((sum, p) => sum + p.fareCents, 0);

  // 5. Calculate Group Discount
  const groupRule = matchGroupRule(totalPassengers, pricingRules.groupDiscountRules);
  const groupDiscountPercentage = groupRule ? groupRule.discountPercentage : 0;
  const groupDiscountCents = Math.round(cruiseFareSubtotalCents * (groupDiscountPercentage / 100));
  const discountedCruiseFareCents = cruiseFareSubtotalCents - groupDiscountCents;

  // 6. Calculate Optional Services
  const availableServices = optionalServiceRepository.getAll();
  const selectedServices = availableServices.filter((s) =>
    selectedOptionalServiceIds.includes(s.id)
  );

  const optionalServiceItems = selectedServices.map((service) => {
    const unitPriceCents = Math.round(service.price * 100);
    let totalCostCents = 0;

    if (service.billingModel === 'per_passenger') {
      totalCostCents = unitPriceCents * totalPassengers;
    } else if (service.billingModel === 'per_passenger_per_night') {
      totalCostCents = unitPriceCents * totalPassengers * (cruise.durationNights || 1);
    } else if (service.billingModel === 'per_booking') {
      totalCostCents = unitPriceCents;
    } else {
      totalCostCents = unitPriceCents * totalPassengers;
    }

    return {
      id: service.id,
      name: service.name,
      billingModel: service.billingModel,
      unitPrice: service.price,
      totalCostCents,
      totalCost: centsToDollars(totalCostCents),
    };
  });

  const optionalServicesSubtotalCents = optionalServiceItems.reduce((sum, s) => sum + s.totalCostCents, 0);

  // 7. Calculate Pre-Promo Subtotal
  const preDiscountSubtotalCents = discountedCruiseFareCents + optionalServicesSubtotalCents;

  // 8. Evaluate Promotional Code
  let promoDiscountCents = 0;
  let promoResult = {
    code: promoCode ? promoCode.trim().toUpperCase() : '',
    applied: false,
    discountType: null,
    discountValue: 0,
    amountCents: 0,
    amount: 0.0,
    message: promoCode ? 'No promotional code applied' : 'None',
  };

  if (promoCode && promoCode.trim()) {
    const codeClean = promoCode.trim().toUpperCase();
    const promoDoc = promoCodeRepository.getByCode(codeClean);

    if (!promoDoc) {
      promoResult.message = `Invalid promotional code '${codeClean}'`;
    } else if (!promoDoc.active) {
      promoResult.message = `Promotional code '${codeClean}' is inactive`;
    } else if (promoDoc.startDate && currentDate < promoDoc.startDate) {
      promoResult.message = `Promotional code '${codeClean}' is not active yet`;
    } else if (promoDoc.endDate && currentDate > promoDoc.endDate) {
      promoResult.message = `Promotional code '${codeClean}' has expired`;
    } else if (promoDoc.minSpend && centsToDollars(preDiscountSubtotalCents) < promoDoc.minSpend) {
      promoResult.message = `Minimum spend of $${promoDoc.minSpend} required for promo code '${codeClean}'`;
    } else {
      const totalRedemptions = promoRedemptionRepository.getByPromoCode(codeClean).length;
      if (promoDoc.maxTotalRedemptions && totalRedemptions >= promoDoc.maxTotalRedemptions) {
        promoResult.message = `Promotional code '${codeClean}' has reached maximum usage limit`;
      } else {
        // Valid Promo Code
        if (promoDoc.discountType === 'PERCENTAGE') {
          promoDiscountCents = Math.round(preDiscountSubtotalCents * (promoDoc.value / 100));
        } else if (promoDoc.discountType === 'FIXED') {
          promoDiscountCents = Math.min(preDiscountSubtotalCents, Math.round(promoDoc.value * 100));
        }

        promoResult = {
          code: codeClean,
          applied: true,
          discountType: promoDoc.discountType,
          discountValue: promoDoc.value,
          amountCents: promoDiscountCents,
          amount: centsToDollars(promoDiscountCents),
          message: `Applied ${promoDoc.discountType === 'PERCENTAGE' ? `${promoDoc.value}%` : `$${promoDoc.value}`} discount`,
        };
      }
    }
  }

  // 9. Calculate Taxable Amount & 12% Mandatory Tax
  const taxableAmountCents = Math.max(0, preDiscountSubtotalCents - promoDiscountCents);
  const taxRate = pricingRules.taxRate || 0.12;
  const taxAmountCents = Math.round(taxableAmountCents * taxRate);

  // 10. Final Grand Total
  const finalTotalCents = taxableAmountCents + taxAmountCents;

  return {
    cruise: {
      id: cruise.id,
      name: cruise.name,
      line: cruise.line,
      destination: cruise.destination,
      durationNights: cruise.durationNights,
      baseAdultFare: cruise.baseAdultFare,
      baseAdultFareCents,
    },
    passengers: {
      adultCount: adultAges.length,
      childCount: childrenAges.length,
      totalPassengers,
      breakdown: passengerBreakdown,
    },
    cruiseFareSubtotal: centsToDollars(cruiseFareSubtotalCents),
    cruiseFareSubtotalCents,
    groupDiscount: {
      passengerCount: totalPassengers,
      discountPercentage: groupDiscountPercentage,
      amountCents: groupDiscountCents,
      amount: centsToDollars(groupDiscountCents),
    },
    discountedCruiseFare: centsToDollars(discountedCruiseFareCents),
    discountedCruiseFareCents,
    optionalServices: {
      items: optionalServiceItems,
      subtotalCents: optionalServicesSubtotalCents,
      subtotal: centsToDollars(optionalServicesSubtotalCents),
    },
    preDiscountSubtotal: centsToDollars(preDiscountSubtotalCents),
    preDiscountSubtotalCents,
    promotionalDiscount: promoResult,
    taxableAmount: centsToDollars(taxableAmountCents),
    taxableAmountCents,
    tax: {
      rate: taxRate,
      ratePercentage: Math.round(taxRate * 100),
      amountCents: taxAmountCents,
      amount: centsToDollars(taxAmountCents),
    },
    finalTotal: centsToDollars(finalTotalCents),
    finalTotalCents,
  };
};

/**
 * Helper to parse and validate passenger ages from flexible input structures
 */
const parsePassengerAges = (input) => {
  if (!input) return [];

  let ages = [];

  if (Array.isArray(input)) {
    ages = input.map((item) => (typeof item === 'number' ? item : item && typeof item.age === 'number' ? item.age : NaN));
  } else if (typeof input === 'object') {
    const adultCount = input.adultCount || 0;
    const childrenAges = input.childrenAges || [];

    for (let i = 0; i < adultCount; i++) {
      ages.push(30); // Default adult age 30 if not specified
    }

    if (Array.isArray(childrenAges)) {
      ages.push(...childrenAges);
    }
  }

  // Validate ages
  ages.forEach((age) => {
    if (typeof age !== 'number' || isNaN(age) || age < 0 || !Number.isInteger(age)) {
      throw new Error(`Invalid passenger age: '${age}'. Age must be a non-negative integer.`);
    }
  });

  return ages;
};

/**
 * Helper to find matching child rule for a given age
 */
const matchChildRule = (age, rules = []) => {
  return rules.find((rule) => age >= rule.minAge && age <= rule.maxAge);
};

/**
 * Helper to find matching group discount rule for a passenger count
 */
const matchGroupRule = (count, rules = []) => {
  if (!rules || rules.length === 0) return null;
  const match = rules.find((rule) => count >= rule.minPassengers && count <= rule.maxPassengers);
  if (match) return match;
  // If count exceeds highest tier maxPassengers, pick highest tier
  const sorted = [...rules].sort((a, b) => b.minPassengers - a.minPassengers);
  if (count >= sorted[0].minPassengers) return sorted[0];
  return null;
};

/**
 * Converts integer cents to formatted dollar float rounded to 2 decimals
 */
const centsToDollars = (cents) => {
  return Math.round(cents) / 100;
};
