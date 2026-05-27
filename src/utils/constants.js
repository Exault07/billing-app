// App-wide constants

export const ROLES = {
  OWNER: 'owner',
  STAFF: 'staff',
  ACCOUNTANT: 'accountant',
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: 'Owner',
  [ROLES.STAFF]: 'Staff',
  [ROLES.ACCOUNTANT]: 'Accountant',
};

// Bill status options
export const BILL_STATUS = {
  DRAFT: 'draft',
  PAID: 'paid',
  UNPAID: 'unpaid',
  PARTIALLY_PAID: 'partially_paid',
  CANCELLED: 'cancelled',
};

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'credit', label: 'Credit (Udhaar)' },
];

// Product categories (Furniture & Hardware)
export const PRODUCT_CATEGORIES = [
  'Furniture',
  'Plywood & Board',
  'Hardware & Fittings',
  'Locks & Security',
  'Paint & Finish',
  'Adhesives & Sealants',
  'Tools',
  'Electrical',
  'Pipes & Sanitaryware',
  'Other',
];

// Units of measurement
export const UNITS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'ft', label: 'Feet' },
  { value: 'sqft', label: 'Square Feet' },
  { value: 'mtr', label: 'Meters' },
  { value: 'ltr', label: 'Litres' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
];
