const { getMetrics } = require('../services/monitoring.service');

const getMetricsStatus = (req, res) => {
  res.status(200).json(getMetrics());
};

module.exports = {
  getMetricsStatus,
};
