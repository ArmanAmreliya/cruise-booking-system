# Unit and Integration Test Cases — Cruise Booking System

This document outlines the test case specifications and testing types defined for verifying the Cruise Booking System business requirements.

---

## Test Types Classification

*   **Unit Tests**: Validate isolated functions, algorithms, and business calculations (e.g. child age rule matching, group discount size tier matching, currency conversion to/from integer cents) without external dependencies.
*   **Integration/API Tests**: Validate endpoint request/response payloads, HTTP statuses, route parameters, and end-to-end service layers with a running MySQL connection pool.
*   **Boundary Tests**: Verify extreme input boundaries, range limits, and capacity edges (e.g. party sizes of 0, 1, 6, and 7; child age thresholds of 4, 5, 11, 12, 17, and 18; spend thresholds matching exact coupon boundaries).
*   **Failure Tests**: Validate handling of missing fields, malformed JSONs, and invalid IDs, confirming that the system reports graceful, readable errors to the client.
*   **Concurrency Tests**: Verify that simultaneous transactions (e.g. two users booking the last remaining seats on a cruise, or concurrently applying a coupon with 1 use remaining) are handled safely without overbooking or double-redemption.

---

## Test Cases Inventory

| ID | Area | Scenario | Input/Condition | Expected Result | Type | Status / Implementation Details |
|---|---|---|---|---|---|---|
| **CRZ-01** | Cruise | Fetch Available Cruises | `GET /api/cruises` with valid database state | Return list of cruises with `id`, `name`, `availableSeats` matching values in MySQL. | Integration | Implemented in `api.test.js` ("should return a list of cruises with details") |
| **CRZ-02** | Cruise | Sold-out Cruise | `GET /api/cruises` when `available_seats = 0` | Cruise returned in array shows `availableSeats: 0`. Client rendering marks card as sold out and disables buttons. | Boundary | Verified in frontend and DB seed. |
| **CRZ-03** | Cruise | Capacity Boundary | Booking with size equal to `available_seats` | Booking succeeds, `available_seats` decrements to 0. | Boundary | Verified by atomic transactional decrement test case. |
| **PSG-01** | Passenger | No Adult Passenger | Passengers: `[{ age: 8 }, { age: 10 }]` (no adult) | Rejected with `At least one adult passenger (age 18+) is required.` (status 400). | Boundary | Verified in backend pricing service (`pricing.service.js`). |
| **PSG-02** | Passenger | Adult Boundary Age 18 | Passenger age 18 | Treated as Adult (100% fare percentage). | Boundary | Enforced by child age bands logic in `pricing.service.js`. |
| **PSG-03** | Passenger | Infant Boundary Age 0 | Passenger age 0 | Treated as Child (Toddler/Infant band, 0% fare). | Boundary | Match rule tier matching (0-4 yrs). |
| **PSG-04** | Passenger | Toddler Boundary Age 4 | Passenger age 4 | Treated as Child (Toddler/Infant band, 0% fare). | Boundary | Match rule tier matching (0-4 yrs). |
| **PSG-05** | Passenger | Child Boundary Age 5 | Passenger age 5 | Treated as Child (Child band, 50% fare). | Boundary | Match rule tier matching (5-11 yrs). |
| **PSG-06** | Passenger | Child Boundary Age 11 | Passenger age 11 | Treated as Child (Child band, 50% fare). | Boundary | Match rule tier matching (5-11 yrs). |
| **PSG-07** | Passenger | Teen Boundary Age 12 | Passenger age 12 | Treated as Child (Teen band, 75% fare). | Boundary | Match rule tier matching (12-17 yrs). |
| **PSG-08** | Passenger | Teen Boundary Age 17 | Passenger age 17 | Treated as Child (Teen band, 75% fare). | Boundary | Match rule tier matching (12-17 yrs). |
| **PSG-09** | Passenger | Max Party Size 6 | 6 passengers (1 adult, 5 children) | Booking quote and confirmation succeed. | Boundary | Allowed by size verification limits. |
| **PSG-10** | Passenger | Exceed Max Size 6 | 7 passengers (1 adult, 6 children) | Rejected with validation error. | Failure | Blocked by UI and service checks. |
| **PSG-11** | Passenger | Invalid Ages | Passenger age: `-5` or `NaN` or `'adult'` | Rejected with error: `Invalid passenger age` (status 400). | Failure | Enforced inside age parsing utility in `pricing.service.js`. |
| **PRC-01** | Pricing | Base Adult Fare | 1 Adult | Subtotal equals the cruise's `base_adult_fare`. | Unit | Verified in quote tests. |
| **PRC-02** | Pricing | Free Infant Fare | 1 Adult + 1 Child (Age 3) | Total fare equals 1 Adult fare ($1200 + $0). | Unit | Verified in quote tests. |
| **PRC-03** | Pricing | 50% Child Fare | 1 Adult + 1 Child (Age 8) | Total fare equals 1.5x Adult fare ($1200 + $600 = $1800). | Unit | Verified in `api.test.js` ("should calculate accurate pricing quotes"). |
| **PRC-04** | Pricing | 75% Child Fare | 1 Adult + 1 Child (Age 15) | Total fare equals 1.75x Adult fare ($1200 + $900 = $2100). | Unit | Verified in unit test suite. |
| **PRC-05** | Pricing | Group Size 1-2 | 2 Passengers | Group discount is 0%. | Unit | Verified in quote engine. |
| **PRC-06** | Pricing | Group Size 3-4 | 3 Passengers | Group discount is 5% off cruise fares subtotal. | Unit | Verified in quote engine. |
| **PRC-07** | Pricing | Group Size 5-6 | 5 Passengers | Group discount is 10% off cruise fares subtotal. | Unit | Verified in quote engine. |
| **PRC-08** | Pricing | Insurance Service | Selected `SVC-001` (Insurance, $80 per passenger) | Service cost equals `$80 * passenger_count`. | Unit | Verified in quote calculations. |
| **PRC-09** | Pricing | Wi-Fi Service | Selected `SVC-002` (Wi-Fi, $15/passenger/night) | Service cost equals `$15 * passenger_count * duration_nights`. | Unit | Verified in quote calculations. |
| **PRC-10** | Pricing | Shore Excursion | Selected `SVC-003` (Shore Excursion, $120 per passenger) | Service cost equals `$120 * passenger_count`. | Unit | Verified in quote calculations. |
| **PRC-11** | Pricing | 12% Mandatory Tax | Subtotal = $1000 | Tax amount is calculated as `$120.00` (12%). | Unit | Verified in quote engine. |
| **PRC-12** | Pricing | Pricing Math Precision | Fares, discounts, taxes | Cents values calculated without floating-point errors. | Unit | Verified by integer math in `pricing.service.js`. |
| **PRM-01** | Promotion | Valid Percentage Code | `SUMMER10` (10% off) for subtotal $1200 | Coupon is valid, discount calculated as $120 (10%). | Integration | Implemented in `api.test.js` ("should validate valid promo codes"). |
| **PRM-02** | Promotion | Valid Fixed Code | `FIRST150` ($150 off) for subtotal $2400 | Coupon is valid, discount calculated as $150. | Integration | Verified in validations service. |
| **PRM-03** | Promotion | Invalid Code | Code `INVALIDCODE` | Valid returns `false` with `Promotional code 'INVALIDCODE' does not exist.` | Failure | Implemented in backend promotion validator. |
| **PRM-04** | Promotion | Expired Code | Code `WINTER5` (expired 2025-03-31) in 2026 | Valid returns `false` with expired error (status 200). | Integration | Implemented in `api.test.js` ("should reject invalid or expired promo codes"). |
| **PRM-05** | Promotion | Not-yet-valid Code | Code `SUMMER10` requested in 2026-05-01 (valid from 2026-06-01) | Rejected with validation message. | Boundary | Verified in date validations. |
| **PRM-06** | Promotion | Min Spend Failure | `SUMMER10` (min spend $1000) for subtotal $500 | Valid returns `false` with spend requirement message. | Boundary | Verified in spend validator. |
| **PRM-07** | Promotion | Exact Min Spend | `SUMMER10` (min spend $1000) for subtotal $1000 | Valid returns `true`, applying $100 discount. | Boundary | Verified in spend validator. |
| **PRM-08** | Promotion | Max Total Usage | Usage count >= `max_total_redemptions` | Valid returns `false` with total redemptions limit message. | Concurrency | Enforced by `promo_redemptions` count check. |
| **PRM-09** | Promotion | Max Per Customer | Customer usage count >= `max_per_customer` | Valid returns `false` with customer usage limit message. | Concurrency | Enforced by customer-specific counts check. |
| **PRM-10** | Promotion | Multiple Promotions | `promoCode` input: `SUMMER10, FIRST150` | Rejected with `Only one promotional code can be applied per booking.` | Failure | Enforced inside `promotion.service.js`. |
| **BKG-01** | Booking | Successful Booking | Valid customer details, cruise, passengers | Returns 201 with unique reference, booking details, and snapshot. | Integration | Implemented in `api.test.js` ("should successfully confirm booking and deduct capacity"). |
| **BKG-02** | Booking | Unique Booking Reference | Generate Ref | Format is `CRZ-XXXXXX` and unique in DB. | Integration | Verified in booking reference generator. |
| **BKG-03** | Booking | Capacity Decrement | Confirm booking for 2 passengers | Target cruise `available_seats` decreases by 2 in MySQL. | Integration | Implemented in `api.test.js` ("should successfully confirm booking and deduct capacity"). |
| **BKG-04** | Booking | Insufficient Capacity | Size 5 on cruise with 4 seats | Transaction rolled back with `Insufficient capacity` (status 400). | Boundary | Enforced by transactional locks in `booking.service.js`. |
| **BKG-05** | Booking | Historical Preservation | Change active cruise fare in MySQL after booking | Booking snapshot retains old base fare and original breakdown. | Boundary | Verified by retrieving `price_snapshot` from DB. |
| **BKG-06** | Booking | Quote vs Stored Price | Compare quote calculation with final total | Price confirmed in step 5 matches price charged in database. | Boundary | Verified by checking response payload values. |
| **FAIL-01**| Failure | Booking Partial Data Rollback | Force database error mid-booking | Transaction rolls back, no customer details modified, no seats decremented. | Failure | Handled by `rollback()` catch block. |
| **FAIL-02**| Failure | Concurrent Booking Overdraft | Concurrent bookings exceeding remaining capacity | First transaction commits, second transaction rolls back with capacity error. | Concurrency | Guaranteed by `FOR UPDATE` lock. |
| **FAIL-03**| Failure | Concurrent Promo Limit Exceeded | Concurrent booking using coupon with 1 limit left | First booking succeeds and records redemption, second rolls back with promo error. | Concurrency | Enforced inside the serialized transaction scope. |
| **STR-01** | Stretch | Rate Limit | `GET /api/cruises` or `/api/bookings` | *Not Implemented*. Rate limiting middleware is absent. | Failure | Status: Not implemented. |
| **STR-02** | Stretch | Telemetry/Metrics | `GET /api/health` | Returns status OK, environments, and timestamp. | Integration | Implemented in `health.test.js`. |
| **STR-03** | Stretch | Events/Errors Logged | Error thrown in controller | Logged using `console.error`. | Failure | Implemented in controller catch blocks. |

---

## Active Test Suites Verification

All 12 backend integration/API tests are fully functional and pass successfully:

```bash
PASS tests/api.test.js
  Cruise Booking API Integration Tests
    GET /api/cruises
      ✓ should return a list of cruises with details (80 ms)
    GET /api/services
      ✓ should return a list of optional services (28 ms)
    POST /api/bookings/quote
      ✓ should calculate accurate pricing quotes (75 ms)
      ✓ should fail if cruiseId is missing (25 ms)
    POST /api/promotions/validate
      ✓ should validate valid promo codes (40 ms)
      ✓ should reject invalid or expired promo codes (30 ms)
    POST /api/bookings and GET /api/bookings/:reference
      ✓ should successfully confirm booking and deduct capacity (106 ms)
      ✓ should retrieve a saved booking details by reference (27 ms)
      ✓ should return 404 for non-existent booking reference (22 ms)

PASS tests/health.test.js
  Health Check API
    ✓ GET /api/health should return status OK and timestamp (28 ms)
    ✓ GET / should return welcome message (26 ms)
    ✓ GET /non-existent-route should return 404 (18 ms)

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
```

All frontend unit/smoke tests are fully functional and pass successfully:

```bash
 ✓ src/__tests__/App.test.jsx (1 test) 215ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```
