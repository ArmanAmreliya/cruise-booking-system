const request = require('supertest');
const { disconnectDB, connectDB } = require('../src/utils/db');
const logger = require('../src/utils/logger');
const { getMetrics } = require('../src/services/monitoring.service');

describe('Observability & Security Stretch Goals Tests', () => {
  let app;

  beforeAll(async () => {
    // Set low rate limit thresholds for testing BEFORE requiring the app
    process.env.RATE_LIMIT_MAX_REQUESTS = '5';
    process.env.RATE_LIMIT_WINDOW_MS = '10000'; // 10 seconds

    // Isolate modules so middleware reads the new process.env variables
    jest.isolateModules(() => {
      app = require('../src/app');
    });

    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('API Rate Limiting', () => {
    it('allows requests within limit and rejects requests exceeding limit with 429', async () => {
      // 1. Send 5 successful requests (equal to max limit)
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
      }

      // 2. The 6th request must exceed the limit and return 429
      const resExceeded = await request(app).get('/api/health');
      expect(resExceeded.statusCode).toBe(429);
      expect(resExceeded.body).toHaveProperty('error', 'Too many requests, please try again later.');
    });
  });

  describe('Application Monitoring Metrics', () => {
    it('returns the monitoring metrics and increments request counters', async () => {
      // Get metrics before
      const metricsBefore = getMetrics();

      // Trigger a request to increment total requests count
      // Note: We bypass rate limiter by hitting root '/' or using a different endpoint
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);

      const metricsAfter = getMetrics();
      // Total requests should be incremented
      expect(metricsAfter.totalRequests).toBeGreaterThan(metricsBefore.totalRequests);
    });

    it('tracks successful and failed bookings count', async () => {
      const metricsBefore = getMetrics();

      // Trigger a failed booking attempt (missing parameters)
      const resFail = await request(app)
        .post('/api/bookings')
        .send({
          cruiseId: 'CRZ-INVALID',
        });
      expect(resFail.statusCode).toBe(400);

      const metricsAfter = getMetrics();
      expect(metricsAfter.failedBookings).toBe(metricsBefore.failedBookings + 1);
    });

    it('tracks promotion validation failures', async () => {
      const metricsBefore = getMetrics();

      // Validate an invalid promo code
      const resPromo = await request(app)
        .post('/api/promotions/validate')
        .send({
          promoCode: 'INVALID_CODE',
          preDiscountSubtotal: 100,
        });
      expect(resPromo.statusCode).toBe(200);
      expect(resPromo.body.valid).toBe(false);

      const metricsAfter = getMetrics();
      expect(metricsAfter.promotionValidationFailures).toBe(metricsBefore.promotionValidationFailures + 1);
    });
  });

  describe('Structured JSON Logging', () => {
    it('respects PII sanitization limits and filters sensitive fields', () => {
      let loggedOutput = null;

      // Mock console.log to capture the output
      const originalLog = console.log;
      console.log = (msg) => {
        loggedOutput = JSON.parse(msg);
      };

      try {
        logger.info('test_event', 'Test message with sensitive data', {
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '+1-555-0199',
          safeField: 'Regular Value',
        });
      } finally {
        // Restore console.log
        console.log = originalLog;
      }

      expect(loggedOutput).not.toBeNull();
      expect(loggedOutput.event).toBe('test_event');
      expect(loggedOutput.meta.name).toBe('[REDACTED_PII]');
      expect(loggedOutput.meta.email).toBe('[REDACTED_PII]');
      expect(loggedOutput.meta.phone).toBe('[REDACTED_PII]');
      expect(loggedOutput.meta.safeField).toBe('Regular Value');
    });
  });
});
