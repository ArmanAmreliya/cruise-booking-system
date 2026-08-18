# Cruise Booking System

A full-stack cruise booking application built with **React**, **Express/Node.js**, and **MySQL**.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Running Tests](#running-tests)
- [Linting & Build](#linting--build)
- [Observability](#observability)
- [Documentation](#documentation)

---

## Overview

A multi-step booking engine that handles:

- Cruise selection with real-time seat availability
- Traveller configuration (adults + children by age)
- Optional services (Insurance, Wi-Fi, Shore Excursions)
- Promotional code validation with usage limits
- Atomic booking confirmation with overbooking protection
- Detailed price breakdown with historical snapshot preservation

All business logic (fares, discounts, tax, promo limits, capacity) lives exclusively in the **backend** — the React frontend is a pure presentation layer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | Node.js, Express 4 |
| Database | MySQL 8.x (`mysql2/promise` pool) |
| Testing (BE) | Jest, Supertest |
| Testing (FE) | Vitest, React Testing Library |
| Linting (FE) | Oxlint |
| Linting (BE) | ESLint 9 |

---

## Project Structure

```
cruise-booking-system/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx             # Root component, step orchestration
│   │   ├── components/         # StepCruise, StepTravellers, StepServices,
│   │   │                       # StepPromotion, StepConfirmation
│   │   └── utils/fmt.js        # Currency formatter
│   └── vite.config.js          # Dev proxy: /api → localhost:5000
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── app.js              # Express app setup, middleware, routes
│   │   ├── server.js           # Entry point (connects DB, starts server)
│   │   ├── controllers/        # Thin HTTP handlers
│   │   ├── routes/             # Route definitions
│   │   ├── services/           # Business logic
│   │   │   ├── pricing.service.js     # Fare bands, group discounts, tax
│   │   │   ├── promotion.service.js   # Coupon validation, limits
│   │   │   ├── booking.service.js     # Atomic transaction checkout
│   │   │   └── monitoring.service.js  # In-memory metrics registry
│   │   ├── middleware/
│   │   │   ├── rateLimit.middleware.js   # express-rate-limit protection
│   │   │   └── monitoring.middleware.js  # Request logging & metrics
│   │   └── utils/
│   │       ├── db.js           # MySQL connection pool
│   │       ├── schema.sql      # Table definitions (auto-applied on start)
│   │       ├── seed.js         # Seeds database with demo data
│   │       └── logger.js       # Structured JSON logger with PII redaction
│   └── tests/
│       ├── api.test.js         # Core API integration tests (12 tests)
│       ├── health.test.js      # Health / root route tests (3 tests)
│       └── observability.test.js # Rate limiting, monitoring, logging tests
│
├── BusinessRequirements.md
├── TechnicalApproach.md
└── UnitTestCases.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **MySQL 8.x** running locally (or accessible remotely)
- A MySQL user with `CREATE DATABASE` / `CREATE TABLE` privileges

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/ArmanAmreliya/cruise-booking-system.git
cd cruise-booking-system

# 2. Install backend dependencies
cd server && npm install

# 3. Install frontend dependencies
cd ../client && npm install
```

---

## Environment Variables

Create `server/.env` (copy from the table below). All variables have sensible defaults for local development.

| Variable | Default | Description |
|---|---|---|
| `MYSQL_HOST` | `127.0.0.1` | MySQL host |
| `MYSQL_PORT` | `3306` | MySQL port |
| `MYSQL_USER` | `root` | MySQL username |
| `MYSQL_PASSWORD` | _(empty)_ | MySQL password |
| `MYSQL_DATABASE` | `cruise_db` | Database name |
| `PORT` | `5000` | Express server port |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms (1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per IP per window |

Example `server/.env`:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=cruise_db
PORT=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Database Setup

The schema is **auto-applied** on every server start — no manual migration step needed.

To seed the database with demo cruises, promotional codes, services, and the demo user **Arman**:

```bash
cd server
npm run seed
```

This will **drop and recreate** all tables then insert fresh seed data. Run this after tests if available seats have been consumed.

### Seed Data Summary

**Cruises (5)**

| Ship | Destination | Nights | Fare | Seats |
|---|---|---|---|---|
| Royal Caribbean — Wonder of the Seas | Caribbean | 7 | $1,200 | 12 |
| Celebrity Cruises — Celebrity Beyond | Mediterranean | 10 | $1,850 | 4 |
| Norwegian Cruise Line — Norwegian Prima | Alaska | 5 | $950 | 20 |
| Princess Cruises — Sky Princess | North Europe | 12 | $2,100 | 2 |
| MSC Cruises — MSC Seascape | Atlantic to Bahamas | 4 | $700 | 0 (Sold Out) |

**Promotional Codes (4)**

| Code | Type | Value | Min Spend | Expires |
|---|---|---|---|---|
| `SUMMER10` | 10% off | 10% | $1,000 | Aug 31 2026 |
| `FIRST150` | Fixed | $150 | $2,000 | Dec 31 2026 |
| `CREW25` | 25% off | 25% | None | Dec 31 2026 |
| `WINTER5` | 5% off | 5% | None | Mar 31 2025 *(expired)* |

---

## Running the Application

### Backend

```bash
cd server
npm run dev        # Development (nodemon, auto-reload)
# or
npm start          # Production
```

The API starts on **http://localhost:5000**.

### Frontend

```bash
cd client
npm run dev
```

The React app starts on **http://localhost:5173** and proxies all `/api` requests to the backend automatically.

> Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/cruises` | List cruises with real-time seat availability |
| `GET` | `/api/services` | List optional services and pricing |
| `POST` | `/api/bookings/quote` | Calculate itemised price breakdown |
| `POST` | `/api/promotions/validate` | Validate a promotional code |
| `POST` | `/api/bookings` | Confirm booking (atomic transaction) |
| `GET` | `/api/bookings/:reference` | Retrieve a booking by reference |
| `GET` | `/api/monitoring` | Live application metrics |

### Example: Quote Request

```bash
curl -X POST http://localhost:5000/api/bookings/quote \
  -H "Content-Type: application/json" \
  -d '{
    "cruiseId": "CRZ-101",
    "passengers": [{ "age": 35 }, { "age": 8 }],
    "selectedOptionalServiceIds": ["SVC-001"],
    "promoCode": "SUMMER10"
  }'
```

### Example: Confirm Booking

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customer": { "name": "Arman", "email": "arman@example.com", "phone": "+91-9999-0001" },
    "cruiseId": "CRZ-101",
    "passengers": [{ "age": 35 }, { "age": 8 }],
    "selectedOptionalServiceIds": ["SVC-001"],
    "promoCode": "SUMMER10"
  }'
```

---

## Running Tests

### Backend (Jest + Supertest)

```bash
cd server
npm test
```

Expected output: **18 tests passing** across 3 suites:

- `api.test.js` — Core API integration (9 tests)
- `health.test.js` — Health and root routes (3 tests)
- `observability.test.js` — Rate limiting, monitoring, logging (6 tests)

### Frontend (Vitest)

```bash
cd client
npm test
```

Expected output: **1 test passing** (App smoke test).

> **Note**: Run `npm run seed` in the `server/` directory before running tests to ensure fresh seat availability.

---

## Linting & Build

```bash
# Lint frontend (Oxlint)
cd client && npm run lint

# Lint backend (ESLint)
cd server && npm run lint

# Production build (frontend)
cd client && npm run build
# Output: client/dist/
```

---

## Observability

### Rate Limiting

All `/api/*` endpoints are protected by `express-rate-limit`.

- Default: **100 requests per IP per 60 seconds**
- Exceeding the limit returns **HTTP 429** with:
  ```json
  { "error": "Too many requests, please try again later.", "statusCode": 429 }
  ```
- Configure via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` in `server/.env`.

### Monitoring Metrics

```bash
GET /api/monitoring
```

Returns live in-memory counters:

```json
{
  "totalRequests": 47,
  "successfulRequests": 44,
  "failedRequests": 3,
  "averageResponseTimeMs": 18.4,
  "successfulBookings": 2,
  "failedBookings": 1,
  "promotionValidationFailures": 1
}
```

### Structured Logging

All significant events are logged to stdout in structured JSON format:

```json
{ "level": "info",  "timestamp": "...", "event": "booking_success", "message": "...", "meta": { ... } }
{ "level": "warn",  "timestamp": "...", "event": "promo_validation_failure", "message": "...", "meta": { ... } }
{ "level": "error", "timestamp": "...", "event": "booking_failure", "message": "...", "meta": { ... } }
```

**PII Protection**: Customer names, emails, and phone numbers are automatically redacted (`[REDACTED_PII]`) from all log metadata.

---

## Documentation

| File | Description |
|---|---|
| [BusinessRequirements.md](./BusinessRequirements.md) | Domain rules, seed data, fare bands, and promo codes |
| [TechnicalApproach.md](./TechnicalApproach.md) | Architecture, data model, pricing design, decisions |
| [UnitTestCases.md](./UnitTestCases.md) | Full test case specifications across all business areas |