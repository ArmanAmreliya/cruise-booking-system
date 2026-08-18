const express = require('express');
const { validatePromo } = require('../controllers/promotions.controller');

const router = express.Router();

router.post('/validate', validatePromo);

module.exports = router;
