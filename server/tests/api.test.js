const request = require('supertest');
const app = require('../src/app');
const { disconnectDB, connectDB } = require('../src/utils/db');

describe('Cruise Booking API Integration Tests', () => {
  beforeAll(async () => {
    // Ensure DB is connected
    await connectDB();
  });

  afterAll(async () => {
    // Close MySQL connection pool gracefully
    await disconnectDB();
  });

  describe('GET /api/cruises', () => {
    it('should return a list of cruises with details', async () => {
      const res = await request(app).get('/api/cruises');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('availableSeats');
    });
  });

  describe('GET /api/services', () => {
    it('should return a list of optional services', async () => {
      const res = await request(app).get('/api/services');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('price');
    });
  });

  describe('POST /api/bookings/quote', () => {
    it('should calculate accurate pricing quotes', async () => {
      const res = await request(app)
        .post('/api/bookings/quote')
        .send({
          cruiseId: 'CRZ-101',
          passengers: [{ age: 30 }, { age: 8 }], // 1 Adult, 1 Child
          selectedOptionalServiceIds: ['SVC-001'], // Insurance
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cruiseFareSubtotal');
      expect(res.body).toHaveProperty('finalTotal');
      expect(res.body.passengers.adultCount).toBe(1);
      expect(res.body.passengers.childCount).toBe(1);
    });

    it('should fail if cruiseId is missing', async () => {
      const res = await request(app)
        .post('/api/bookings/quote')
        .send({
          passengers: [{ age: 30 }],
        });
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/promotions/validate', () => {
    it('should validate valid promo codes', async () => {
      const res = await request(app)
        .post('/api/promotions/validate')
        .send({
          promoCode: 'SUMMER10',
          preDiscountSubtotal: 1200, // $1200, meets $1000 minimum spend
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discountType).toBe('PERCENTAGE');
      expect(res.body.discountValue).toBe(10);
    });

    it('should reject invalid or expired promo codes', async () => {
      const res = await request(app)
        .post('/api/promotions/validate')
        .send({
          promoCode: 'WINTER5',
          preDiscountSubtotal: 100,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.valid).toBe(false);
    });
  });

  describe('POST /api/bookings and GET /api/bookings/:reference', () => {
    let bookingReference = '';

    it('should successfully confirm booking and deduct capacity', async () => {
      // 1. Get initial available seats for verification
      const cruisesRes = await request(app).get('/api/cruises');
      const targetCruise = cruisesRes.body.find((c) => c.id === 'CRZ-101');
      const initialSeats = targetCruise.availableSeats;

      // 2. Create the booking
      const res = await request(app)
        .post('/api/bookings')
        .send({
          customer: {
            name: 'Arman Amreliya',
            email: 'arman.test@example.com',
            phone: '+919999999999',
          },
          cruiseId: 'CRZ-101',
          passengers: [{ age: 35 }, { age: 32 }],
          selectedOptionalServiceIds: ['SVC-001'],
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('bookingReference');
      bookingReference = res.body.bookingReference;

      // 3. Verify capacity was decremented by 2
      const cruisesResAfter = await request(app).get('/api/cruises');
      const targetCruiseAfter = cruisesResAfter.body.find((c) => c.id === 'CRZ-101');
      expect(targetCruiseAfter.availableSeats).toBe(initialSeats - 2);
    });

    it('should retrieve a saved booking details by reference', async () => {
      expect(bookingReference).not.toBe('');
      const res = await request(app).get(`/api/bookings/${bookingReference}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('bookingReference', bookingReference);
      expect(res.body.customer.name).toBe('Arman Amreliya');
    });

    it('should return 404 for non-existent booking reference', async () => {
      const res = await request(app).get('/api/bookings/CRZ-INVALID');
      expect(res.statusCode).toEqual(404);
    });
  });
});
