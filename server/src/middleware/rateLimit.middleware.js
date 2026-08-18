const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

const rateLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.',
    statusCode: 429,
  },
  // Ensure that in test environments, rate limiter uses key Generator correctly or doesn't fail
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
});

module.exports = rateLimiter;
