import { promoCodeRepository } from '../storage/promoCodeRepository';
import { promoRedemptionRepository } from '../storage/promoRedemptionRepository';

/**
 * Finds a promotion by code (case-insensitive).
 *
 * @param {string} code
 * @returns {Object|null}
 */
export const findPromotion = (code) => {
  if (!code || typeof code !== 'string') return null;
  return promoCodeRepository.getByCode(code.trim());
};

/**
 * Validates whether a promotional code can be applied to a booking.
 *
 * @param {Object} params
 * @param {string|Array<string>} params.promoCode - Promo code string (or multiple codes attempt)
 * @param {string} [params.customerId] - Customer ID to evaluate per-customer limits
 * @param {number} params.preDiscountSubtotal - Subtotal amount in dollars (or cents if specified)
 * @param {boolean} [params.isSubtotalInCents=false] - Whether preDiscountSubtotal is passed in cents
 * @param {string} [params.currentDate] - Date string 'YYYY-MM-DD' for validity check
 * @returns {Object} Validation result containing status, error message, and calculated discount
 */
export const validatePromotion = ({
  promoCode,
  customerId = null,
  preDiscountSubtotal = 0,
  isSubtotalInCents = false,
  currentDate = new Date().toISOString().split('T')[0],
}) => {
  // 1. One Code Per Booking Rule
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

  // 2. Code Must Exist
  const promotion = findPromotion(cleanCode);
  if (!promotion) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' does not exist.`);
  }

  // 3. Active Status Check
  if (!promotion.active) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' is inactive.`);
  }

  // 4. Date Validity Boundaries Check
  const validFrom = promotion.validFrom || promotion.startDate;
  const validTo = promotion.validTo || promotion.endDate;

  if (validFrom && currentDate < validFrom) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' is not valid until ${validFrom}.`);
  }

  if (validTo && currentDate > validTo) {
    return createInvalidResult(cleanCode, `Promotional code '${cleanCode}' expired on ${validTo}.`);
  }

  // Normalize Subtotal to Cents
  const subtotalCents = isSubtotalInCents
    ? Math.round(preDiscountSubtotal)
    : Math.round(preDiscountSubtotal * 100);
  const subtotalDollars = subtotalCents / 100;

  // 5. Minimum Spend Requirement Check
  const minSpendDollars = promotion.minSpend || 0;
  if (minSpendDollars > 0 && subtotalDollars < minSpendDollars) {
    return createInvalidResult(
      cleanCode,
      `Minimum spend of $${minSpendDollars.toLocaleString()} required for promo code '${cleanCode}'.`
    );
  }

  // 6. Maximum Total Usage Limit Check
  const allRedemptions = promoRedemptionRepository.getByPromoCode(cleanCode);
  if (promotion.maxTotalRedemptions && allRedemptions.length >= promotion.maxTotalRedemptions) {
    return createInvalidResult(
      cleanCode,
      `Promotional code '${cleanCode}' has reached maximum total redemptions limit (${promotion.maxTotalRedemptions}).`
    );
  }

  // 7. Maximum Per-Customer Usage Limit Check
  if (customerId && promotion.maxPerCustomer) {
    const customerRedemptions = allRedemptions.filter((r) => r.customerId === customerId);
    if (customerRedemptions.length >= promotion.maxPerCustomer) {
      return createInvalidResult(
        cleanCode,
        `Customer limit reached (${promotion.maxPerCustomer}) for promotional code '${cleanCode}'.`
      );
    }
  }

  // 8. Calculate Discount Amount
  const discountCalculation = calculateDiscount(promotion, subtotalCents, true);

  return {
    valid: true,
    code: cleanCode,
    promotion: {
      id: promotion.id,
      code: promotion.code,
      discountType: promotion.discountType,
      value: promotion.value,
      minSpend: promotion.minSpend,
      validFrom: validFrom,
      validTo: validTo,
    },
    discountType: promotion.discountType,
    discountValue: promotion.value,
    discountAmount: discountCalculation.discountAmount,
    discountAmountCents: discountCalculation.discountAmountCents,
    error: null,
    message: `Applied ${promotion.discountType === 'PERCENTAGE' ? `${promotion.value}%` : `$${promotion.value}`} discount`,
  };
};

/**
 * Calculates discount amount in integer cents and formatted dollars.
 *
 * @param {Object} promotion - Promotion document
 * @param {number} subtotal - Subtotal amount (in dollars or cents)
 * @param {boolean} [isCents=false] - Whether subtotal is passed in cents
 * @returns {{ discountAmountCents: number, discountAmount: number }}
 */
export const calculateDiscount = (promotion, subtotal, isCents = false) => {
  if (!promotion) {
    return { discountAmountCents: 0, discountAmount: 0 };
  }

  const subtotalCents = isCents ? Math.round(subtotal) : Math.round(subtotal * 100);

  let discountCents = 0;
  if (promotion.discountType === 'PERCENTAGE') {
    discountCents = Math.round(subtotalCents * (promotion.value / 100));
  } else if (promotion.discountType === 'FIXED') {
    discountCents = Math.min(subtotalCents, Math.round(promotion.value * 100));
  }

  return {
    discountAmountCents: discountCents,
    discountAmount: Math.round(discountCents) / 100,
  };
};

/**
 * Records a redemption entry ONLY when a booking is actually confirmed.
 *
 * @param {Object} params
 * @param {string} params.promoCode - Promotional code
 * @param {string} params.bookingReference - Unique booking reference ID
 * @param {string} [params.customerId] - Customer ID
 * @param {number} params.discountAmount - Applied discount amount
 * @returns {Object} Redemption document
 */
export const recordRedemption = ({ promoCode, bookingReference, customerId = null, discountAmount = 0 }) => {
  if (!promoCode || !bookingReference) {
    throw new Error('Promo code and booking reference are required to record a redemption.');
  }

  const cleanCode = promoCode.trim().toUpperCase();
  const promotion = findPromotion(cleanCode);

  if (!promotion) {
    throw new Error(`Cannot record redemption for invalid promo code '${cleanCode}'.`);
  }

  return promoRedemptionRepository.saveRedemption({
    promoCode: cleanCode,
    promotionId: promotion.id,
    bookingReference,
    customerId,
    discountAmount,
  });
};

/**
 * Helper to construct standardized invalid result objects
 */
const createInvalidResult = (code, errorMessage) => {
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
