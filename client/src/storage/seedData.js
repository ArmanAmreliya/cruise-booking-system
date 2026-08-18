export const SEED_CRUISES = [
  {
    id: 'CRZ-101',
    name: 'Caribbean Sunshine Cruise',
    destination: 'Caribbean',
    departureDate: '2026-10-15',
    durationNights: 7,
    baseAdultFare: 800, // Price in USD
    capacity: 50,
    availableSeats: 50,
  },
  {
    id: 'CRZ-102',
    name: 'Mediterranean Discovery Voyage',
    destination: 'Mediterranean',
    departureDate: '2026-11-01',
    durationNights: 10,
    baseAdultFare: 1200,
    capacity: 40,
    availableSeats: 40,
  },
  {
    id: 'CRZ-103',
    name: 'Alaskan Glacier Expedition',
    destination: 'Alaska',
    departureDate: '2026-09-20',
    durationNights: 5,
    baseAdultFare: 950,
    capacity: 30,
    availableSeats: 30,
  },
];

export const SEED_PROMO_CODES = [
  {
    id: 'PROMO-001',
    code: 'WELCOME10',
    discountType: 'PERCENTAGE', // PERCENTAGE or FIXED
    value: 10, // 10%
    active: true,
    description: '10% discount on pre-tax subtotal',
  },
  {
    id: 'PROMO-002',
    code: 'SUMMER50',
    discountType: 'FIXED',
    value: 50, // $50 flat discount
    active: true,
    description: '$50 flat discount on pre-tax subtotal',
  },
  {
    id: 'PROMO-003',
    code: 'SAIL2026',
    discountType: 'PERCENTAGE',
    value: 15, // 15%
    active: true,
    description: '15% discount on pre-tax subtotal',
  },
];

export const SEED_PRICING_RULES = {
  taxRate: 0.12, // 12% mandatory tax
  childAgeRules: [
    { minAge: 0, maxAge: 2, discountPercentage: 100, label: 'Infant (0-2 years)' },
    { minAge: 3, maxAge: 12, discountPercentage: 50, label: 'Child (3-12 years)' },
    { minAge: 13, maxAge: 17, discountPercentage: 25, label: 'Teen (13-17 years)' },
  ],
  groupDiscountRule: {
    minPassengers: 5,
    discountPercentage: 10, // 10% discount on base adult fares for groups >= 5
    label: 'Group Discount (5+ Passengers)',
  },
};

export const SEED_OPTIONAL_SERVICES = [
  {
    id: 'SVC-001',
    name: 'Unlimited Wi-Fi Package',
    price: 50,
    billingModel: 'per_booking', // per_booking or per_person
    description: 'High-speed internet access for the entire stay',
  },
  {
    id: 'SVC-002',
    name: 'Beverage & Dining Pass',
    price: 120,
    billingModel: 'per_person',
    description: 'Unlimited premium drinks and specialty restaurant dining',
  },
  {
    id: 'SVC-003',
    name: 'Shore Excursion Pass',
    price: 150,
    billingModel: 'per_person',
    description: 'Guided shore tours at all port destinations',
  },
  {
    id: 'SVC-004',
    name: 'Travel Insurance',
    price: 40,
    billingModel: 'per_booking',
    description: 'Full trip cancellation and medical coverage',
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
