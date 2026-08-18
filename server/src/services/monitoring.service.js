/**
 * Monitoring Service — tracks application-level metrics in-memory.
 */

const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  successfulBookings: 0,
  failedBookings: 0,
  promotionValidationFailures: 0,
  totalResponseTimeMs: 0,
};

const recordRequest = (durationMs, success = true) => {
  metrics.totalRequests += 1;
  metrics.totalResponseTimeMs += durationMs;
  if (success) {
    metrics.successfulRequests += 1;
  } else {
    metrics.failedRequests += 1;
  }
};

const recordBookingSuccess = () => {
  metrics.successfulBookings += 1;
};

const recordBookingFailure = () => {
  metrics.failedBookings += 1;
};

const recordPromoValidationFailure = () => {
  metrics.promotionValidationFailures += 1;
};

const getMetrics = () => {
  const averageResponseTimeMs = metrics.totalRequests > 0
    ? Math.round((metrics.totalResponseTimeMs / metrics.totalRequests) * 100) / 100
    : 0;

  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    averageResponseTimeMs,
    successfulBookings: metrics.successfulBookings,
    failedBookings: metrics.failedBookings,
    promotionValidationFailures: metrics.promotionValidationFailures,
  };
};

module.exports = {
  recordRequest,
  recordBookingSuccess,
  recordBookingFailure,
  recordPromoValidationFailure,
  getMetrics,
};
