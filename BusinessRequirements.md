# Cruise Booking System — Business Requirements Document

This document captures the business requirements, domain concepts, configuration parameters, and seed data for the Cruise Booking System.

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

## 2. Business Rules & Configuration Parameters

### 2.1 Child Fare Rules
- **0–4 years**: 0% of adult fare (Free)
- **5–11 years**: 50% of adult fare
- **12–17 years**: 75% of adult fare
- **18+ years**: 100% of adult fare (Adult)

### 2.2 Group Discounts
- **1–2 passengers**: 0% discount
- **3–4 passengers**: 5% discount
- **5–6 passengers**: 10% discount

### 2.3 Optional Services
- **Insurance**: $80 per passenger
- **Wi-Fi**: $15 per passenger per night
- **Shore Excursion**: $120 per passenger

### 2.4 Mandatory Tax
- **12% Tax** rate applied to the discounted subtotal.

### 2.5 Pricing Integrity
- **Price Shown = Price Charged**: The calculated price breakdown presented to the customer during review must match the exact final charged amount recorded upon confirmation.

### 2.6 Historical Booking Reconstruction
- Permanently reconstruct exactly what was sold and for how much even after pricing rules change, by storing an embedded financial snapshot in the booking record.

---

## 3. Seed Data

### 3.1 Cruise Catalog Seed Records (5 Total)
1. **Royal Caribbean — Wonder of the Seas**: Destination: Caribbean | 7 nights | Base Fare: $1,200 | Capacity: 12 (Available: 12)
2. **Celebrity Cruises — Celebrity Beyond**: Destination: Mediterranean | 10 nights | Base Fare: $1,850 | Capacity: 4 (Available: 4)
3. **Norwegian Cruise Line — Norwegian Prima**: Destination: Alaska | 5 nights | Base Fare: $950 | Capacity: 20 (Available: 20)
4. **Princess Cruises — Sky Princess**: Destination: North Europe | 12 nights | Base Fare: $2,100 | Capacity: 2 (Available: 2)
5. **MSC Cruises — MSC Seascape**: Destination: Atlantic to Bahamas | 4 nights | Base Fare: $700 | Capacity: 0 (Available: 0 / Sold Out)

### 3.2 Promotional Codes Seed Records (4 Total)
1. **SUMMER10**: 10% discount | Valid: Jun 1 2026 to Aug 31 2026 | Max 100 total redemptions | Max 1/customer | Min spend: $1,000
2. **FIRST150**: $150 fixed discount | Valid: Jan 1 2026 to Dec 31 2026 | Max 500 total redemptions | Max 1/customer | Min spend: $2,000
3. **CREW25**: 25% discount | Valid: Jan 1 2026 to Dec 31 2026 | Max 3 total redemptions | Max 3/customer | No minimum spend
4. **WINTER5**: 5% discount | Valid: Jan 1 2025 to Mar 31 2025 | Max 1,000 total redemptions | Max 5/customer | No minimum spend (Expired)
