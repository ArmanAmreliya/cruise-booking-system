const express = require('express');
const { createQuote, confirmBooking, getBooking } = require('../controllers/bookings.controller');

const router = express.Router();

router.post('/quote', createQuote);
router.post('/', confirmBooking);
router.get('/:reference', getBooking);

module.exports = router;
