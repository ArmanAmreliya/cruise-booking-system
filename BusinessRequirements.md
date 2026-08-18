# Cruise Booking System — Business Requirements Document

This document captures the business requirements, domain concepts, configuration parameters, and identified gaps for the Cruise Booking System assessment.

---

## 1. Customer Booking Flow

The system must support the following step-by-step customer booking lifecycle:

1. **Find Available Cruise**: Search and select an available cruise based on itinerary and capacity.
2. **Specify Passengers**: Define travelling party breakdown including number of adults, number of children, and individual ages for each child.
3. **Select Optional Services**: Choose zero or more optional add-on services.
4. **Calculate & Display Price Breakdown**: Calculate and present an itemized price breakdown (base fares, child fare rules, group discounts, optional services, promotional discounts, and 12% tax) prior to booking confirmation.
5. **Apply Promotional Code**: Apply at most **one** valid promotional code per booking.
6. **Confirm Booking**: Submit and lock the reservation.
7. **Receive Booking Reference**: Generate and display a unique booking reference identifier.

---

## 2. Core Functional Requirements

### 2.1 Cruise Availability & Capacity
- The system must manage cruise inventory and enforce capacity limits when searching and booking available cruises.
- Bookings must be blocked or rejected if requested passenger count exceeds available capacity.

### 2.2 Passenger & Child-Age Pricing Rules
- Support passenger differentiation between adults and children.
- Require exact ages for all travelling children.
- Evaluate configurable child fare rules based on age bands (e.g., infant/child tier discounts).

### 2.3 Group Discounts
- Evaluate configurable group discount rules based on passenger count or party structure.

### 2.4 Optional Services
- Allow selection of optional add-on amenities/services during booking.
- Calculate add-on costs dynamically from configuration.

### 2.5 Promotional Code Rules
- Allow applying at most **one** promotional code per booking.
- Validate promotional code eligibility and calculate applicable discounts dynamically.

### 2.6 Tax Calculation & Pricing Integrity (12% Tax)
- Apply a **12% tax** rate to the calculated fare/subtotal as defined in configuration.
- **Price Shown = Price Charged**: The calculated price breakdown presented to the customer during review must match the exact final charged amount recorded upon confirmation.

### 2.7 Historical Booking & Price Reconstruction
- The system must **permanently reconstruct exactly what was sold and for how much**, even after pricing rules, child rules, taxes, optional services, or promo codes change in the future.
- Achieved by storing an immutable financial snapshot of all line items, rates, applied rules, and calculations at booking confirmation time.

### 2.8 Configurable Pricing Rules (No Code Redeployment)
- Fares, child fare rules, group discounts, tax rates (12%), optional services, and promotional codes must be fully manageable via database/data configuration.
- Changes to pricing data/config must take effect without redeploying the application code.

---

## 3. Seed Data Schemas & Seed Instances

### 3.1 Cruise Catalog Seed Data
*Note: Specific catalog entries were not explicitly enumerated in the initial requirements prompt and are defined below as initial seed instances.*

- **Fields**: Cruise ID, Name, Destination, Departure Date, Duration (Nights), Capacity, Available Seats, Base Adult Fare ($).
- **Seed Instances**:
  1. `CRZ-101`: "Caribbean Sunshine Cruise" | Destination: Caribbean | Duration: 7 Nights | Base Fare: $800 | Capacity: 50
  2. `CRZ-102`: "Mediterranean Discovery Voyage" | Destination: Mediterranean | Duration: 10 Nights | Base Fare: $1200 | Capacity: 40
  3. `CRZ-103`: "Alaskan Glacier Expedition" | Destination: Alaska | Duration: 5 Nights | Base Fare: $950 | Capacity: 30

### 3.2 Promotional Code Seed Data
*Note: Specific promotional codes were not explicitly enumerated in the initial requirements prompt and are defined below as initial seed instances.*

- **Fields**: Code, Discount Type (`PERCENTAGE` / `FIXED`), Value, Active Status.
- **Seed Instances**:
  1. `WELCOME10`: 10% discount on pre-tax subtotal
  2. `SUMMER50`: $50 fixed discount on pre-tax subtotal
  3. `SAIL2026`: 15% discount on pre-tax subtotal

---

## 4. Assumptions and Gaps

The following requirements and parameters were underspecified in the original prompt and rely on standard domain assumptions:

1. **Child Age Tiers & Discount Percentages**:
   - *Gap*: The exact age thresholds (e.g., 0–2, 3–12, 13–17) and discount amounts were not explicitly quantified.
   - *Assumption*: Default rules in database config: Age 0–2 (100% off / free), Age 3–12 (50% off), Age 13–17 (25% off).

2. **Group Discount Thresholds**:
   - *Gap*: The minimum passenger count required for group discounts was unstated.
   - *Assumption*: Default rule in database config: Parties of 5 or more passengers receive a 10% group discount on base adult fares.

3. **Optional Services Pricing Model**:
   - *Gap*: Add-on billing models were not specified.
   - *Assumption*: Optional services support pricing models (`per_person` or `per_booking`).

4. **Calculation Order**:
   - *Gap*: Order of operations between child rules, group discounts, promo codes, and 12% tax.
   - *Assumption*: Standard calculation pipeline:
     1. Calculate Base Adult Fares + Child Tier Fares
     2. Apply Group Discount (if eligible)
     3. Add Optional Services
     4. Apply Promotional Code Discount (max 1)
     5. Calculate 12% Tax on discounted subtotal
     6. Compute Final Total = Subtotal + 12% Tax

5. **Payment Processing**:
   - *Gap*: Third-party payment gateway scope was unstated.
   - *Assumption*: Booking confirmation generates the immutable booking record and unique reference without live payment gateway charging.
