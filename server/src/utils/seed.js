/**
 * seed.js — Populate MySQL with initial cruise booking data.
 *
 * Usage:  npm run seed   (from the server/ directory)
 *         node src/utils/seed.js
 *
 * Uses INSERT IGNORE so re-runs are always safe.
 * Auto-creates the database if it doesn't exist yet.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const mysql = require('mysql2/promise');
const { connectDB, getPool, disconnectDB } = require('./db');

/** Create the database if it doesn't exist (runs without selecting a DB). */
async function createDatabaseIfNeeded() {
  const dbName = process.env.MYSQL_DATABASE || 'cruise_db';
  const tmpConn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || '127.0.0.1',
    port:     parseInt(process.env.MYSQL_PORT || '3306', 10),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });
  await tmpConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await tmpConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`  ✔ Database \`${dbName}\` recreated`);
  await tmpConn.end();
}

// ── Seed data (mirrored from client/src/storage/seedData.js) ──────────────
const SEED_CRUISES = [
  { id: 'CRZ-101', line: 'Royal Caribbean',       name: 'Wonder of the Seas',  destination: 'Caribbean',            durationNights: 7,  baseAdultFare: 1200, capacity: 12, availableSeats: 12 },
  { id: 'CRZ-102', line: 'Celebrity Cruises',      name: 'Celebrity Beyond',    destination: 'Mediterranean',        durationNights: 10, baseAdultFare: 1850, capacity: 4,  availableSeats: 4  },
  { id: 'CRZ-103', line: 'Norwegian Cruise Line',  name: 'Norwegian Prima',     destination: 'Alaska',               durationNights: 5,  baseAdultFare: 950,  capacity: 20, availableSeats: 20 },
  { id: 'CRZ-104', line: 'Princess Cruises',       name: 'Sky Princess',        destination: 'North Europe',         durationNights: 12, baseAdultFare: 2100, capacity: 2,  availableSeats: 2  },
  { id: 'CRZ-105', line: 'MSC Cruises',            name: 'MSC Seascape',        destination: 'Atlantic to Bahamas',  durationNights: 4,  baseAdultFare: 700,  capacity: 0,  availableSeats: 0  },
];

const SEED_PROMO_CODES = [
  { id: 'PROMO-001', code: 'SUMMER10', discountType: 'PERCENTAGE', value: 10,  startDate: '2026-06-01', endDate: '2026-08-31', maxTotalRedemptions: 100,  maxPerCustomer: 1, minSpend: 1000, active: true, description: '10% off for summer cruises ($1,000 min spend)' },
  { id: 'PROMO-002', code: 'FIRST150', discountType: 'FIXED',      value: 150, startDate: '2026-01-01', endDate: '2026-12-31', maxTotalRedemptions: 500,  maxPerCustomer: 1, minSpend: 2000, active: true, description: '$150 fixed discount ($2,000 min spend)'          },
  { id: 'PROMO-003', code: 'CREW25',   discountType: 'PERCENTAGE', value: 25,  startDate: '2026-01-01', endDate: '2026-12-31', maxTotalRedemptions: 3,    maxPerCustomer: 3, minSpend: 0,    active: true, description: '25% crew & staff discount'                     },
  { id: 'PROMO-004', code: 'WINTER5',  discountType: 'PERCENTAGE', value: 5,   startDate: '2025-01-01', endDate: '2025-03-31', maxTotalRedemptions: 1000, maxPerCustomer: 5, minSpend: 0,    active: true, description: '5% winter discount (Expired)'                  },
];

const SEED_PRICING_RULES = {
  taxRate: 0.12,
  childAgeRules: [
    { minAge: 0,  maxAge: 4,   farePercentage: 0,   label: 'Toddler/Infant (0-4 yrs): 0% fare'  },
    { minAge: 5,  maxAge: 11,  farePercentage: 50,  label: 'Child (5-11 yrs): 50% fare'          },
    { minAge: 12, maxAge: 17,  farePercentage: 75,  label: 'Teen (12-17 yrs): 75% fare'          },
    { minAge: 18, maxAge: 120, farePercentage: 100, label: 'Adult (18+ yrs): 100% fare'          },
  ],
  groupDiscountRules: [
    { minPassengers: 1, maxPassengers: 2, discountPercentage: 0,  label: '1-2 Passengers: 0% discount'  },
    { minPassengers: 3, maxPassengers: 4, discountPercentage: 5,  label: '3-4 Passengers: 5% discount'  },
    { minPassengers: 5, maxPassengers: 6, discountPercentage: 10, label: '5-6 Passengers: 10% discount' },
  ],
};

const SEED_OPTIONAL_SERVICES = [
  { id: 'SVC-001', name: 'Insurance',       price: 80,  billingModel: 'per_passenger',           description: 'Full travel protection ($80 per passenger)'                  },
  { id: 'SVC-002', name: 'Wi-Fi',           price: 15,  billingModel: 'per_passenger_per_night', description: 'High-speed Wi-Fi ($15 per passenger per night)'               },
  { id: 'SVC-003', name: 'Shore Excursion', price: 120, billingModel: 'per_passenger',           description: 'Guided shore tours pass ($120 per passenger)'                },
];

const SEED_CUSTOMERS = [
  { id: 'CUST-001', name: 'John Doe',      email: 'john.doe@example.com',  phone: '+1-555-0199' },
  { id: 'CUST-ARMAN', name: 'Arman',       email: 'arman@example.com',     phone: '+91-9999-0001' },
];

// ── Seed helpers ─────────────────────────────────────────────────────────────
async function seedCruises(pool) {
  const sql = `
    INSERT IGNORE INTO cruises
      (id, \`line\`, name, destination, duration_nights, base_adult_fare, capacity, available_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  for (const c of SEED_CRUISES) {
    await pool.execute(sql, [c.id, c.line, c.name, c.destination, c.durationNights, c.baseAdultFare, c.capacity, c.availableSeats]);
  }
  console.log(`  ✔ ${SEED_CRUISES.length} cruises seeded`);
}

async function seedPromoCodes(pool) {
  const sql = `
    INSERT IGNORE INTO promo_codes
      (id, code, discount_type, value, start_date, end_date, max_total_redemptions, max_per_customer, min_spend, active, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  for (const p of SEED_PROMO_CODES) {
    await pool.execute(sql, [
      p.id, p.code, p.discountType, p.value,
      p.startDate, p.endDate,
      p.maxTotalRedemptions, p.maxPerCustomer, p.minSpend,
      p.active ? 1 : 0, p.description,
    ]);
  }
  console.log(`  ✔ ${SEED_PROMO_CODES.length} promo codes seeded`);
}

async function seedPricingRules(pool) {
  // Only insert once — IGNORE if row already exists (id=1 implied by AUTO_INCREMENT)
  const sql = `
    INSERT IGNORE INTO pricing_rules (id, tax_rate, child_age_rules, group_rules)
    VALUES (1, ?, ?, ?)
  `;
  await pool.execute(sql, [
    SEED_PRICING_RULES.taxRate,
    JSON.stringify(SEED_PRICING_RULES.childAgeRules),
    JSON.stringify(SEED_PRICING_RULES.groupDiscountRules),
  ]);
  console.log('  ✔ Pricing rules seeded');
}

async function seedOptionalServices(pool) {
  const sql = `
    INSERT IGNORE INTO optional_services (id, name, price, billing_model, description)
    VALUES (?, ?, ?, ?, ?)
  `;
  for (const s of SEED_OPTIONAL_SERVICES) {
    await pool.execute(sql, [s.id, s.name, s.price, s.billingModel, s.description]);
  }
  console.log(`  ✔ ${SEED_OPTIONAL_SERVICES.length} optional services seeded`);
}

async function seedCustomers(pool) {
  const sql = `
    INSERT IGNORE INTO customers (id, name, email, phone)
    VALUES (?, ?, ?, ?)
  `;
  for (const c of SEED_CUSTOMERS) {
    await pool.execute(sql, [c.id, c.name, c.email, c.phone]);
  }
  console.log(`  ✔ ${SEED_CUSTOMERS.length} customers seeded`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🚢  Cruise Booking — MySQL Seed\n');
  try {
    await createDatabaseIfNeeded(); // create DB if not exists
    await connectDB();              // apply schema.sql → create tables
    const pool = getPool();

    await seedCruises(pool);
    await seedPromoCodes(pool);
    await seedPricingRules(pool);
    await seedOptionalServices(pool);
    await seedCustomers(pool);

    console.log('\n✅  Seed complete!\n');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
})();
