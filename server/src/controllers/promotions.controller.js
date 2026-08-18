const { validatePromotionInternal } = require('../services/promotion.service');

const validatePromo = async (req, res) => {
  try {
    const { promoCode, customerId, preDiscountSubtotal } = req.body;

    if (!promoCode) {
      return res.status(400).json({ error: 'promoCode is required.' });
    }

    // Input might be dollars or cents; we will treat it as dollars and convert to cents.
    // Ensure we handle subtotal properly.
    const subtotalCents = Math.round((preDiscountSubtotal || 0) * 100);

    const validation = await validatePromotionInternal({
      promoCode,
      customerId,
      preDiscountSubtotalCents: subtotalCents,
    });

    res.json(validation);
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  validatePromo,
};
