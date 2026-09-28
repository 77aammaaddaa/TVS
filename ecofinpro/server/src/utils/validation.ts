// server/src/utils/validation.ts

export const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

export const isValidEmail = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.toLowerCase());
};

export const isValidPassword = (value: string) => {
    const trimmed = value.trim();
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]{8,}$/.test(trimmed);
};

export const isValidPhoneNumber = (value: string) => {
    const normalized = value.replace(/[^\d+]/g, '');
    const withoutCountryCode = normalized.replace(/^\+?20/, '');
    const local = withoutCountryCode.replace(/^0/, '');

    return /^1[0125]\d{8}$/.test(local);
};

export const isValidLicenseKey = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toUpperCase();
    if (normalized.length < 8 || normalized.length > 30) return false;
    return /^[A-Z0-9\u0600-\u06FF]+(-[A-Z0-9\u0600-\u06FF]+)+$/.test(normalized);
};

// Allowed roles to prevent privilege escalation.
// FIX: added 'SUPER_ADMIN' — superAdmin.service.ts's createAdmin() now
// writes this role onto the employees row it creates for every new admin
// (required so login()/isSuperAdmin() can resolve auth_id -> employee ->
// super_admins). Without it here, any other code path that validates
// employees.role against this list (e.g. a future "edit employee" screen)
// would reject a super admin's own row.
export const VALID_ROLES = ['OWNER', 'SUPER_ADMIN', 'MODERATOR', 'CASHIER', 'COLLECTOR', 'ACCOUNTANT', 'HR_MANAGER', 'WH_MANAGER', 'LAWYER'] as const;
export type ValidRole = typeof VALID_ROLES[number];

export const isValidRole = (value: unknown): value is ValidRole => {
    return typeof value === 'string' && VALID_ROLES.includes(value as ValidRole);
};

// Validate permissions array
export const VALID_MODULES = [
    "dashboard", "pos", "crm", "inventory", "purchases",
    "collection", "reports", "settings", "users", "hr", "attendance", "legal", "suppliers", "purchases", "vaults"
];

export const isValidPermissions = (value: unknown): value is string[] => {
    if (!Array.isArray(value)) return false;
    return value.every(item => typeof item === 'string' && VALID_MODULES.includes(item));
};

// ==================================================
// POS module additions
// ==================================================

// Mirrors the new contracts.sale_type CHECK constraint (migration 002).
export const VALID_SALE_TYPES = ['CASH', 'SHIPPING', 'INSTALLMENT'] as const;
export type ValidSaleType = typeof VALID_SALE_TYPES[number];

export const isValidSaleType = (value: string): value is ValidSaleType =>
    VALID_SALE_TYPES.includes(value as ValidSaleType);

// Cart/contract line items: array of { product_id, quantity }, quantity a
// positive integer. Price is deliberately NOT validated here — the service
// layer always recomputes price server-side from the product row, never
// trusts a client-supplied price (prevents a tampered cart total).
export interface SaleItemInput {
    product_id: string;
    quantity: number;
}

export const isValidSaleItems = (value: unknown): value is SaleItemInput[] => {
    if (!Array.isArray(value) || value.length === 0) return false;
    return value.every(
        (item) =>
            item &&
            typeof item === 'object' &&
            isNonEmptyString((item as any).product_id) &&
            Number.isInteger((item as any).quantity) &&
            (item as any).quantity > 0
    );
};

export const isNonNegativeNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isStrictlyPositiveNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isValidPositiveNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isValidInstallmentCount = (value: unknown, maxMonths = 60): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= maxMonths;

// Customer/CRM: monthly income and credit score bounds.
export const isValidMonthlyIncome = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

export const isValidCreditScore = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 100;