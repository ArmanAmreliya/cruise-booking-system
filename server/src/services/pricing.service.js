const { getPool } = require('../utils/db');

const centsToDollars = (cents) => {
  return Math.round(cents) / 100;
};

const matchChildRule = (age, rules = []) => {
  return rules.find((rule) => age >= rule.minAge && age <= rule.maxAge);
};

const matchGroupRule = (count, rules = []) => {
  if (!rules || rules.length === 0) return null;
  const match = rules.find((rule) => count >= rule.minPassengers && count <= rule.maxPassengers);
  if (match) return match;
  const sorted = [...rules].sort((a, b) => b.minPassengers - a.minPassengers);
  if (count >= sorted[0].minPassengers) return sorted[0];
  return null;
};

const parsePassengerAges = (input) => {
  if (!input) return [];
  let ages = [];
  if (Array.isArray(input)) {
    ages = input.map((item) => (typeof item === 'number' ? item : item && typeof item.age === 'number' ? item.age : NaN));
  } else if (typeof input === 'object') {
    const adultCount = input.adultCount || 0;
    const childrenAges = input.childrenAges || [];
    for (let i = 0; i < adultCount; i++) {
      ages.push(30);
    }
    if (Array.isArray(childrenAges)) {
      ages.push(...childrenAges);
    }
  }

  ages.forEach((age) => {
    if (typeof age !== 'number' || isNaN(age) || age < 0 || !Number.isInteger(age)) {
      throw new Error(`Invalid passenger age: '${age}'. Age must be a non-negative integer.`);
    }
  });

  return ages;
};

/**
 * Calculates price breakdown.
 */
const calculatePriceBreakdown = async ({
  cruiseId,
  passengers: passengerInput,
  selectedOptionalServiceIds = [],
  promoCode = '',
  customerId = null,
  currentDate = new Date().toISOString().split('T')[0],
  dbConnection = null, // Accept an optional connection for transactions
}) => {
  const connection = dbConnection || getPool();

  // 1. Resolve Cruise Document
  const [cruiseRows] = await connection.query('SELECT * FROM cruises WHERE id = ?', [cruiseId]);
  const cruise = cruiseRows[0];
  if (!cruise) {
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

  // 3. Fetch Pricing Rules from Database
  const [ruleRows] = await connection.query('SELECT * FROM pricing_rules LIMIT 1');
  const dbRules = ruleRows[0];
  if (!dbRules) {
    throw new Error('Pricing rules not found in database.');
  }

  // Parse JSON columns
  const pricingRules = {
    taxRate: parseFloat(dbRules.tax_rate),
    childAgeRules: typeof dbRules.child_age_rules === 'string' ? JSON.parse(dbRules.child_age_rules) : dbRules.child_age_rules,
    groupDiscountRules: typeof dbRules.group_rules === 'string' ? JSON.parse(dbRules.group_rules) : dbRules.group_rules,
  };

  const baseAdultFareCents = Math.round(parseFloat(cruise.base_adult_fare) * 100);

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
  let optionalServiceItems = [];
  let optionalServicesSubtotalCents = 0;
  if (selectedOptionalServiceIds.length > 0) {
    const [serviceRows] = await connection.query(
      'SELECT * FROM optional_services WHERE id IN (?)',
      [selectedOptionalServiceIds]
    );

    optionalServiceItems = serviceRows.map((service) => {
      const unitPriceCents = Math.round(parseFloat(service.price) * 100);
      let totalCostCents = 0;

      if (service.billing_model === 'per_passenger') {
        totalCostCents = unitPriceCents * totalPassengers;
      } else if (service.billing_model === 'per_passenger_per_night') {
        totalCostCents = unitPriceCents * totalPassengers * (cruise.duration_nights || 1);
      } else if (service.billing_model === 'per_booking') {
        totalCostCents = unitPriceCents;
      } else {
        totalCostCents = unitPriceCents * totalPassengers;
      }

      return {
        id: service.id,
        name: service.name,
        billingModel: service.billing_model,
        unitPrice: parseFloat(service.price),
        totalCostCents,
        totalCost: centsToDollars(totalCostCents),
      };
    });

    optionalServicesSubtotalCents = optionalServiceItems.reduce((sum, s) => sum + s.totalCostCents, 0);
  }

  // 7. Calculate Pre-Promo Subtotal
  const preDiscountSubtotalCents = discountedCruiseFareCents + optionalServicesSubtotalCents;

  // 8. Evaluate Promotional Code
  let promoResult = {
    code: promoCode ? promoCode.toString().trim().toUpperCase() : '',
    applied: false,
    discountType: null,
    discountValue: 0,
    amountCents: 0,
    amount: 0.0,
    message: promoCode ? 'No promotional code applied' : 'None',
  };

  if (promoCode) {
    const { validatePromotionInternal } = require('./promotion.service');
    const validation = await validatePromotionInternal({
      promoCode,
      customerId,
      preDiscountSubtotalCents,
      currentDate,
      dbConnection: connection,
    });

    promoResult = {
      code: validation.code,
      applied: validation.valid,
      discountType: validation.discountType,
      discountValue: validation.discountValue,
      amountCents: validation.discountAmountCents,
      amount: validation.discountAmount,
      message: validation.message,
      error: validation.error,
    };
  }

  const promoDiscountCents = promoResult.amountCents;

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
      durationNights: cruise.duration_nights,
      baseAdultFare: parseFloat(cruise.base_adult_fare),
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
    pricingRulesSnapshot: pricingRules,
  };
};

module.exports = {
  calculatePriceBreakdown,
};
