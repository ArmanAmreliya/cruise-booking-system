const { recordRequest } = require('../services/monitoring.service');
const logger = require('../utils/logger');

const monitoringMiddleware = (req, res, next) => {
  // Exclude health and monitoring endpoints themselves from standard metrics to avoid noise
  const isNoise = req.originalUrl === '/api/health' || req.originalUrl === '/api/monitoring';
  
  const startHrTime = process.hrtime();

  if (!isNoise) {
    logger.info('api_request', `Incoming ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  }

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1000000;

    const isSuccess = res.statusCode < 400;

    if (!isNoise) {
      recordRequest(durationMs, isSuccess);

      if (!isSuccess) {
        logger.warn('api_error', `API response failed with status ${res.statusCode} on ${req.method} ${req.originalUrl}`, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      }
    }
  });

  next();
};

module.exports = monitoringMiddleware;
