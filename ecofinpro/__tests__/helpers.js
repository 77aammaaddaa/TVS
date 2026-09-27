/**
 * Test Helpers and Mocks for EcoFine Pro
 * أدوات مساعدة ومحاكاة البيانات للاختبارات
 */

// ==========================================
// 1. Mock Data Generators
// ==========================================

/**
 * يولد بيانات مستخدم اختبار
 */
export const createMockUser = (overrides = {}) => ({
  id: 'user_' + Math.random().toString(36).substr(2, 9),
  username: 'testuser',
  password: 'Test@1234',
  role: 'MODERATOR',
  permissions: ['crm', 'pos', 'accounting'],
  email: 'test@ecofine.com',
  branch_id: 'branch_1',
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * يولد بيانات عميل اختبار
 */
export const createMockClient = (overrides = {}) => ({
  id: 'client_' + Math.random().toString(36).substr(2, 9),
  name: 'أحمد محمد',
  national_id: '29001011234567', // 14 digits
  phone: '01012345678',
  email: 'client@example.com',
  address: 'القاهرة - الجزيرة',
  branch_id: 'branch_1',
  job_type: 'PRIVATE',
  monthly_income: 5000,
  credit_score: 650,
  residence_type: 'RENTED',
  survey_status: 'verified',
  status: 'active',
  guarantors: [],
  created_at: new Date().toISOString(),
  synced: false,
  ...overrides,
});

/**
 * يولد بيانات ضامن اختبار
 */
export const createMockGuarantor = (overrides = {}) => ({
  id: 'guarantor_' + Math.random().toString(36).substr(2, 9),
  name: 'محمود أحمد',
  national_id: '28901051234567',
  phone: '01098765432',
  relationship: 'BROTHER',
  credit_score: 700,
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * يولد بيانات فاتورة/عقد اختبار
 */
export const createMockInvoice = (overrides = {}) => ({
  id: 'inv_' + Math.random().toString(36).substr(2, 9),
  client_id: 'client_1',
  type: 'installment', // cash, shipping, installment
  items: [
    { product_id: 'prod_1', name: 'منتج تجريبي', quantity: 1, price: 1000 },
  ],
  total: 1000,
  status: 'active',
  payment_terms: 'monthly', // daily, monthly
  sale_date: new Date().toISOString(),
  warranty_months: 12,
  synced: false,
  ...overrides,
});

/**
 * يولد بيانات قسط اختبار
 */
export const createMockInstallment = (overrides = {}) => ({
  id: 'inst_' + Math.random().toString(36).substr(2, 9),
  contract_id: 'contract_1',
  invoice_id: 'inv_1',
  client_id: 'client_1',
  amount: 500,
  paid_amount: 0,
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  payment_date: null,
  status: 'pending', // pending, paid, overdue
  delay_days: 0,
  delay_penalty: 0,
  notes: '',
  created_at: new Date().toISOString(),
  synced: false,
  ...overrides,
});

/**
 * يولد بيانات منتج اختبار
 */
export const createMockProduct = (overrides = {}) => ({
  id: 'prod_' + Math.random().toString(36).substr(2, 9),
  name: 'منتج تجريبي',
  sku: 'SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
  category_id: 'cat_1',
  cost_price: 500,
  selling_price: 1000,
  quantity: 50,
  warehouse_id: 'wh_1',
  status: 'active',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * يولد بيانات معاملة خزينة اختبار
 */
export const createMockTreasuryTransaction = (overrides = {}) => ({
  id: 'tx_' + Math.random().toString(36).substr(2, 9),
  type: 'INCOME', // INCOME, EXPENSE
  category: 'INSTALLMENT_PAYMENT',
  amount: 500,
  client_id: 'client_1',
  date: new Date().toISOString(),
  description: 'دفع قسط',
  vault_id: 'vault_1',
  synced: false,
  ...overrides,
});

// ==========================================
// 2. Assertion Helpers
// ==========================================

/**
 * التحقق من أن العميل لديه جميع الحقول المطلوبة
 */
export const assertValidClient = (client) => {
  expect(client).toHaveProperty('id');
  expect(client).toHaveProperty('name');
  expect(client).toHaveProperty('national_id');
  expect(client.national_id).toMatch(/^\d{14}$/);
  expect(client).toHaveProperty('phone');
  expect(client).toHaveProperty('email');
  expect(client).toHaveProperty('credit_score');
  expect(client.credit_score).toBeGreaterThanOrEqual(0);
  expect(client.credit_score).toBeLessThanOrEqual(1000);
};

/**
 * التحقق من أن القسط لديه جميع الحقول المطلوبة
 */
export const assertValidInstallment = (installment) => {
  expect(installment).toHaveProperty('id');
  expect(installment).toHaveProperty('contract_id');
  expect(installment).toHaveProperty('amount');
  expect(installment.amount).toBeGreaterThan(0);
  expect(installment).toHaveProperty('status');
  expect(['pending', 'paid', 'overdue']).toContain(installment.status);
};

/**
 * التحقق من أن الفاتورة لديها جميع الحقول المطلوبة
 */
export const assertValidInvoice = (invoice) => {
  expect(invoice).toHaveProperty('id');
  expect(invoice).toHaveProperty('client_id');
  expect(invoice).toHaveProperty('total');
  expect(invoice.total).toBeGreaterThanOrEqual(0);
  expect(invoice).toHaveProperty('items');
  expect(Array.isArray(invoice.items)).toBe(true);
};

// ==========================================
// 3. Test Data Constants
// ==========================================

export const TEST_NATIONAL_IDS = {
  VALID: '29001011234567',
  INVALID: '123456',
  OVER_14_DIGITS: '299010112345678',
};

export const TEST_CREDIT_SCORES = {
  EXCELLENT: 850,
  GOOD: 700,
  FAIR: 500,
  HIGH_RISK: 300,
  REJECTED: 100,
};

export const CREDIT_SCORE_RANGES = {
  A_EXCELLENT: { min: 800, max: 1000, label: 'A_EXCELLENT' },
  B_GOOD: { min: 600, max: 799, label: 'B_GOOD' },
  C_FAIR: { min: 400, max: 599, label: 'C_FAIR' },
  D_HIGH_RISK: { min: 200, max: 399, label: 'D_HIGH_RISK' },
  F_REJECTED: { min: 0, max: 199, label: 'F_REJECTED' },
};

export const INSTALLMENT_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

export const PAYMENT_RADAR_COLORS = {
  GREEN: 'green', // 0-20 days
  AMBER: 'amber', // 21-34 days
  RED: 'red', // 35+ days
};

export const TEST_TIMEOUTS = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  QUERY_TIMEOUT: 10000,
  SYNC_TIMEOUT: 5000,
};
