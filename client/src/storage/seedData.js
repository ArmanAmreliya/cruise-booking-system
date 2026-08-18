export const SEED_CRUISES = [
  {
    id: 'CRZ-101',
    line: 'Royal Caribbean',
    name: 'Wonder of the Seas',
    destination: 'Caribbean',
    durationNights: 7,
    baseAdultFare: 1200,
    capacity: 12,
    availableSeats: 12,
    imageUrl: 'https://contents.odysol.com//content/images/cruise/8/89/ship_520.jpg',
  },
  {
    id: 'CRZ-102',
    line: 'Celebrity Cruises',
    name: 'Celebrity Beyond',
    destination: 'Mediterranean',
    durationNights: 10,
    baseAdultFare: 1850,
    capacity: 4,
    availableSeats: 4,
    imageUrl: 'https://contents.odysol.com//content/images/cruise/8/13717/ship_520.jpg',
  },
  {
    id: 'CRZ-103',
    line: 'Norwegian Cruise Line',
    name: 'Norwegian Prima',
    destination: 'Alaska',
    durationNights: 5,
    baseAdultFare: 950,
    capacity: 20,
    availableSeats: 20,
    imageUrl: 'https://contents.odysol.com//content/images/cruise/8/13645/ship_520.jpg',
  },
  {
    id: 'CRZ-104',
    line: 'Princess Cruises',
    name: 'Sky Princess',
    destination: 'North Europe',
    durationNights: 12,
    baseAdultFare: 2100,
    capacity: 2,
    availableSeats: 2,
    imageUrl: 'https://contents.odysol.com//content/images/cruise/8/85/ship_520.jpg',
  },
  {
    id: 'CRZ-105',
    line: 'MSC Cruises',
    name: 'MSC Seascape',
    destination: 'Atlantic to Bahamas',
    durationNights: 4,
    baseAdultFare: 700,
    capacity: 0,
    availableSeats: 0,
    imageUrl: 'https://contents.odysol.com//content/images/cruise/8/76/ship_520.jpg',
  },
];

export const SEED_PROMO_CODES = [
  {
    id: 'PROMO-001',
    code: 'SUMMER10',
    discountType: 'PERCENTAGE', // PERCENTAGE or FIXED
    value: 10, // 10%
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    maxTotalRedemptions: 100,
    maxPerCustomer: 1,
    minSpend: 1000,
    active: true,
    description: '10% off for summer cruises ($1,000 min spend)',
  },
  {
    id: 'PROMO-002',
    code: 'FIRST150',
    discountType: 'FIXED',
    value: 150, // $150 fixed discount
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxTotalRedemptions: 500,
    maxPerCustomer: 1,
    minSpend: 2000,
    active: true,
    description: '$150 fixed discount ($2,000 min spend)',
  },
  {
    id: 'PROMO-003',
    code: 'CREW25',
    discountType: 'PERCENTAGE',
    value: 25, // 25%
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxTotalRedemptions: 3,
    maxPerCustomer: 3,
    minSpend: 0,
    active: true,
    description: '25% crew & staff discount',
  },
  {
    id: 'PROMO-004',
    code: 'WINTER5',
    discountType: 'PERCENTAGE',
    value: 5, // 5%
    startDate: '2025-01-01',
    endDate: '2025-03-31',
    maxTotalRedemptions: 1000,
    maxPerCustomer: 5,
    minSpend: 0,
    active: true,
    description: '5% winter discount (Expired)',
  },
];

export const SEED_PRICING_RULES = {
  taxRate: 0.12, // 12% mandatory tax
  childAgeRules: [
    { minAge: 0, maxAge: 4, farePercentage: 0, label: 'Toddler/Infant (0-4 yrs): 0% fare' },
    { minAge: 5, maxAge: 11, farePercentage: 50, label: 'Child (5-11 yrs): 50% fare' },
    { minAge: 12, maxAge: 17, farePercentage: 75, label: 'Teen (12-17 yrs): 75% fare' },
    { minAge: 18, maxAge: 120, farePercentage: 100, label: 'Adult (18+ yrs): 100% fare' },
  ],
  groupDiscountRules: [
    { minPassengers: 1, maxPassengers: 2, discountPercentage: 0, label: '1-2 Passengers: 0% discount' },
    { minPassengers: 3, maxPassengers: 4, discountPercentage: 5, label: '3-4 Passengers: 5% discount' },
    { minPassengers: 5, maxPassengers: 6, discountPercentage: 10, label: '5-6 Passengers: 10% discount' },
  ],
};

export const SEED_OPTIONAL_SERVICES = [
  {
    id: 'SVC-001',
    name: 'Insurance',
    price: 80,
    billingModel: 'per_passenger',
    description: 'Full travel protection ($80 per passenger)',
  },
  {
    id: 'SVC-002',
    name: 'Wi-Fi',
    price: 15,
    billingModel: 'per_passenger_per_night',
    description: 'High-speed Wi-Fi ($15 per passenger per night)',
  },
  {
    id: 'SVC-003',
    name: 'Shore Excursion',
    price: 120,
    billingModel: 'per_passenger',
    description: 'Guided shore tours pass ($120 per passenger)',
  },
];

export const SEED_CUSTOMERS = [
  {
    id: 'CUST-001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0199',
  },
];
