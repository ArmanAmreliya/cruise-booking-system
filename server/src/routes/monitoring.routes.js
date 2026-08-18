const express = require('express');
const { getMetricsStatus } = require('../controllers/monitoring.controller');

const router = express.Router();

router.get('/', getMetricsStatus);

module.exports = router;
