const { getPool } = require('../utils/db');
const logger = require('../utils/logger');
const { recordPromoValidationFailure } = require('./monitoring.service');

const createInvalidResult = (code, errorMessage) => {
  logger.warn('promo_validation_failure', `Promotion validation failed for code '${code}': ${errorMessage}`, {
    code,
    error: errorMessage,
  });
  recordPromoValidationFailure();

  return {
    valid: false,
    code: code || '',
    promotion: null,
    discountType: null,
    discountValue: 0,
    discountAmount: 0,
    discountAmountCents: 0,
    error: errorMessage,
    message: errorMessage,
  };
};

const calculateDiscount = (promotion, subtotalCents) => {
  let discountCents = 0;
  const val = parseFloat(promotion.value);
  if (promotion.discount_type === 'PERCENTAGE') {
    discountCents = Math.round(subtotalCents * (val / 100));
  } else if (promotion.discount_type === 'FIXED') {
    discountCents = Math.min(subtotalCents, Math.round(val * 100));
  }

  return {
    discountAmountCents: discountCents,
    discountAmount: discountCents / 100,
  };
};

const validatePromotionInternal = async ({
  promoCode,
  customerId = null,
  preDiscountSubtotalCents = 0,
  currentDate = new Date().toISOString().split('T')[0],
  dbConnection = null,
}) => {
  const connection = dbConnection || getPool();

  if (Array.isArray(promoCode)) {
    if (promoCode.length > 1) {
      return createInvalidResult(null, 'Only one promotional code can be applied per booking.');
    }
    promoCode = promoCode[0];
  } else if (typeof promoCode === 'string' && (promoCode.includes(',') || promoCode.includes(';'))) {
    return createInvalidResult(null, 'Only one promotional code can be applied per booking.');
  }

  if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) {
    return createInvalidResult(null, 'No promotional code provided.');
  }

  const cleanCode = promoCode.trim().toUpperCase();

  // Find promotion
  const [promoRows] = await connection.query('SELECT * FROM promo_codes WHERE UPPER(code) = ?', [cleanCode]);
  const promotion = promoRows[0];
  if (!promotion) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' does not exist.`);
  }

  // Active status check
  if (!promotion.active) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' is inactive.`);
  }

  // Date boundaries
  const validFrom = promotion.start_date ? new Date(promotion.start_date).toISOString().split('T')[0] : null;
  const validTo = promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : null;

  if (validFrom && currentDate < validFrom) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' is not valid until ${validFrom}.`);
  }

  if (validTo && currentDate > validTo) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' expired on ${validTo}.`);
  }

  // Minimum spend
  const subtotalDollars = preDiscountSubtotalCents / 100;
  const minSpend = parseFloat(promotion.min_spend);
  if (minSpend > 0 && subtotalDollars < minSpend) {
    return createInvalidResult(
      cleanCode,
      `Minimum spend of $${minSpend.toLocaleString()} required for promo code '${cleanCode}'.`
    );
  }

  // Maximum total redemptions limit check
  const [allRedemptionsRows] = await connection.query(
    'SELECT COUNT(*) as count FROM promo_redemptions WHERE UPPER(promo_code) = ?',
    [cleanCode]
  );
  const totalRedemptions = allRedemptionsRows[0].count;
  if (promotion.max_total_redemptions && totalRedemptions >= promotion.max_total_redemptions) {
    return createInvalidResult(
      cleanCode,
      `Promotional code '${cleanCode}' has reached maximum total redemptions limit (${promotion.max_total_redemptions}).`
    );
  }

  // Maximum per-customer usage check
  if (customerId && promotion.max_per_customer) {
    const [customerRedemptionsRows] = await connection.query(
      'SELECT COUNT(*) as count FROM promo_redemptions WHERE UPPER(promo_code) = ? AND customer_id = ?',
      [cleanCode, customerId]
    );
    const customerRedemptions = customerRedemptionsRows[0].count;
    if (customerRedemptions >= promotion.max_per_customer) {
      return createInvalidResult(
        cleanCode,
        `Customer limit reached (${promotion.max_per_customer}) for promotional code '${cleanCode}'.`
      );
    }
  }

  // Calculate discount
  const discountCalculation = calculateDiscount(promotion, preDiscountSubtotalCents);

  return {
    valid: true,
    code: cleanCode,
    promotion: {
      id: promotion.id,
      code: promotion.code,
      discountType: promotion.discount_type,
      value: parseFloat(promotion.value),
      minSpend: parseFloat(promotion.min_spend),
      validFrom,
      validTo,
    },
    discountType: promotion.discount_type,
    discountValue: parseFloat(promotion.value),
    discountAmount: discountCalculation.discountAmount,
    discountAmountCents: discountCalculation.discountAmountCents,
    error: null,
    message: `Applied ${promotion.discount_type === 'PERCENTAGE' ? `${parseFloat(promotion.value)}%` : `$${parseFloat(promotion.value)}`} discount`,
  };
};

module.exports = {
  validatePromotionInternal,
};
