-- ============================================================
--  Cruise Booking System — MySQL Schema
--  Run automatically on server start via db.js (connectDB)
--  or manually: mysql -u root -p cruise_db < schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS cruises (
  id               VARCHAR(20)    NOT NULL PRIMARY KEY,
  `line`           VARCHAR(100)   NOT NULL,
  name             VARCHAR(150)   NOT NULL,
  destination      VARCHAR(150)   NOT NULL,
  duration_nights  TINYINT        NOT NULL DEFAULT 0,
  base_adult_fare  DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  capacity         INT            NOT NULL DEFAULT 0,
  available_seats  INT            NOT NULL DEFAULT 0,
  created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id                    VARCHAR(20)   NOT NULL PRIMARY KEY,
  code                  VARCHAR(50)   NOT NULL UNIQUE,
  discount_type         ENUM('PERCENTAGE','FIXED') NOT NULL,
  value                 DECIMAL(10,2) NOT NULL,
  start_date            DATE          NOT NULL,
  end_date              DATE          NOT NULL,
  max_total_redemptions INT           NOT NULL DEFAULT 0,
  max_per_customer      INT           NOT NULL DEFAULT 1,
  min_spend             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  active                TINYINT(1)    NOT NULL DEFAULT 1,
  description           VARCHAR(255),
  created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id               INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tax_rate         DECIMAL(5,4) NOT NULL DEFAULT 0.1200,
  -- JSON columns store the child-age and group-discount rule arrays
  child_age_rules  JSON         NOT NULL,
  group_rules      JSON         NOT NULL,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS optional_services (
  id            VARCHAR(20)   NOT NULL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  billing_model VARCHAR(50)   NOT NULL,
  description   VARCHAR(255),
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id         VARCHAR(20)  NOT NULL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  phone      VARCHAR(30),
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id              VARCHAR(30)    NOT NULL PRIMARY KEY,
  customer_id     VARCHAR(20)    NOT NULL,
  cruise_id       VARCHAR(20)    NOT NULL,
  passengers      JSON           NOT NULL,           -- array of passenger objects
  services        JSON,                              -- selected optional services
  promo_code_id   VARCHAR(20),
  subtotal        DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  discount        DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  tax             DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  total           DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  status          ENUM('PENDING','CONFIRMED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id)   REFERENCES customers(id),
  FOREIGN KEY (cruise_id)     REFERENCES cruises(id),
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id)
);
