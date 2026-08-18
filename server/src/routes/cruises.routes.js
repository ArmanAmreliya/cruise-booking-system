const express = require('express');
const { getCruises } = require('../controllers/cruises.controller');

const router = express.Router();

router.get('/', getCruises);

module.exports = router;
