const { calculatePriceBreakdown } = require('../services/pricing.service');
const { confirmBookingInternal, getBookingByReference } = require('../services/booking.service');

const createQuote = async (req, res) => {
  try {
    const { cruiseId, passengers, selectedOptionalServiceIds, promoCode, customerId } = req.body;

    if (!cruiseId) {
      return res.status(400).json({ error: 'cruiseId is required.' });
    }
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({ error: 'passengers array is required.' });
    }

    const breakdown = await calculatePriceBreakdown({
      cruiseId,
      passengers,
      selectedOptionalServiceIds,
      promoCode,
      customerId,
    });

    res.json(breakdown);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(400).json({ error: error.message });
  }
};

const confirmBooking = async (req, res) => {
  try {
    const { customer, cruiseId, passengers, selectedOptionalServiceIds, promoCode } = req.body;

    if (!customer || !customer.name || !customer.email) {
      return res.status(400).json({ error: 'customer object with name and email is required.' });
    }
    if (!cruiseId) {
      return res.status(400).json({ error: 'cruiseId is required.' });
    }
    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({ error: 'passengers array is required.' });
    }

    const booking = await confirmBookingInternal({
      customer,
      cruiseId,
      passengers,
      selectedOptionalServiceIds,
      promoCode,
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(400).json({ error: error.message });
  }
};

const getBooking = async (req, res) => {
  try {
    const { reference } = req.params;
    const booking = await getBookingByReference(reference);
    if (!booking) {
      return res.status(404).json({ error: `Booking '${reference}' not found.` });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error retrieving booking:', error);
    res.status(500).json({ error: 'Failed to retrieve booking.' });
  }
};

module.exports = {
  createQuote,
  confirmBooking,
  getBooking,
};
