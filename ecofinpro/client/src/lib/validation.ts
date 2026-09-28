export interface ValidationResult<T extends Record<string, any>> {
    isValid: boolean
    errors: Partial<Record<keyof T, string>>
}

export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}

export type CustomerFormValues = {
    name: string
    phone: string
    national_id: string
    monthly_income: string
    credit_score: string | number
}

export type AuthCredentials = {
    email: string
    password: string
}

export const isNonEmptyString = (value: unknown) => typeof value === 'string' && value.trim().length > 0

export const isValidFullName = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (normalized.length < 6 || normalized.length > 80) return false
    const names = normalized.split(' ')
    if (names.length < 2) return false
    return /^[\p{L}'’-]+(?: [\p{L}'’-]+)+$/u.test(normalized)
}

export const isValidPhoneNumber = (value: string) => {
    const normalized = value.replace(/[^\d+]/g, '')
    if (!normalized) return false
    const withCountryCode = normalized.replace(/^\+?20/, '')
    return /^1[0125]\d{8}$/.test(withCountryCode)
}

export const isValidEgyptianNationalId = (value: string) => {
    const normalized = value.replace(/\D/g, '')
    if (!/^\d{14}$/.test(normalized)) return false

    const centuryDigit = normalized.charAt(0)
    if (!['2', '3', '4'].includes(centuryDigit)) return false

    const year = Number(normalized.slice(1, 3))
    const month = Number(normalized.slice(3, 5))
    const day = Number(normalized.slice(5, 7))
    const century = centuryDigit === '2' ? 1900 : centuryDigit === '3' ? 2000 : 2100
    const fullYear = century + year
    const date = new Date(fullYear, month - 1, day)
    if (date.getFullYear() !== fullYear || date.getMonth() + 1 !== month || date.getDate() !== day) {
        return false
    }

    const digits = normalized.split('').map(Number)
    const weights = Array.from({ length: 13 }, (_, index) => Math.pow(2, 13 - index) % 11)
    const sum = digits.slice(0, 13).reduce((acc, digit, index) => acc + digit * weights[index], 0)
    let checkDigit = 11 - (sum % 11)
    if (checkDigit === 10) checkDigit = 0
    if (checkDigit === 11) checkDigit = 1

    return checkDigit === digits[13]
}

export const isValidPositiveMoney = (value: string | number) => {
    const amount = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.-]/g, ''))
    return Number.isFinite(amount) && amount > 0
}

export const isValidCreditScore = (value: string | number) => {
    const score = typeof value === 'number' ? value : Number(value)
    return Number.isInteger(score) && score >= 0 && score <= 100
}

export const isValidEmail = (value: string) => {
    const normalized = value.trim().toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export const isValidPassword = (value: string) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]{8,}$/.test(value)
}

export const isValidLicenseKey = (value: string) => {
    const normalized = value.trim().toUpperCase().replace(/\s+/g, '')
    if (normalized.length < 10 || normalized.length > 40) return false
    return /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)
}

export const validateCustomerForm = (values: CustomerFormValues): ValidationResult<CustomerFormValues> => {
    const errors: Record<string, string> = {}

    if (!isNonEmptyString(values.name)) {
        errors.name = 'الاسم مطلوب.'
    } else if (!isValidFullName(values.name)) {
        errors.name = 'الاسم غير صالح. أدخل الاسم الكامل بأحرف صحيحة وفصل بين الأسماء بمسافة.'
    }

    if (!isNonEmptyString(values.phone)) {
        errors.phone = 'رقم الهاتف مطلوب.'
    } else if (!isValidPhoneNumber(values.phone)) {
        errors.phone = 'رقم الهاتف غير صالح. استخدم صيغة رقم مصرية صحيحة.'
    }

    if (!isNonEmptyString(values.national_id)) {
        errors.national_id = 'الرقم القومي مطلوب.'
    } else if (!isValidEgyptianNationalId(values.national_id)) {
        errors.national_id = 'الرقم القومي غير صالح. يجب أن يكون 14 رقمًا صحيحًا.'
    }

    if (!isNonEmptyString(values.monthly_income)) {
        errors.monthly_income = 'الدخل الشهري مطلوب.'
    } else if (!isValidPositiveMoney(values.monthly_income)) {
        errors.monthly_income = 'الدخل الشهري يجب أن يكون رقماً موجباً.'
    }

    if (!isNonEmptyString(String(values.credit_score))) {
        errors.credit_score = 'التقييم الائتماني مطلوب.'
    } else if (!isValidCreditScore(values.credit_score)) {
        errors.credit_score = 'التقييم يجب أن يكون عددًا صحيحًا بين 0 و100.'
    }

    return { isValid: Object.keys(errors).length === 0, errors }
}


export const validateActivationKey = (value: string) => {
    if (!isNonEmptyString(value)) {
        return { isValid: false, error: 'كود التفعيل مطلوب.' }
    }
    return { isValid: isValidLicenseKey(value), error: isValidLicenseKey(value) ? '' : 'كود التفعيل غير صالح.' }
}

export const validateCredentials = (credentials: AuthCredentials): ValidationResult<AuthCredentials> => {
    const errors: Record<string, string> = {}
    if (!isNonEmptyString(credentials.email)) {
        errors.email = 'البريد الإلكتروني مطلوب.'
    } else if (!isValidEmail(credentials.email)) {
        errors.email = 'البريد الإلكتروني غير صالح.'
    }

    if (!isNonEmptyString(credentials.password)) {
        errors.password = 'كلمة المرور مطلوبة.'
    } else if (!isValidPassword(credentials.password)) {
        errors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أحرف وأرقام.'
    }

    return { isValid: Object.keys(errors).length === 0, errors }
}

export const assertValidStoreName = (tableName: string) => {
    if (!tableName || typeof tableName !== 'string' || tableName.trim().length === 0) {
        throw new Error('اسم الجدول غير صالح.')
    }
    if (!ALL_STORES.includes(tableName)) {
        throw new Error(`اسم الجدول غير معتمد: ${tableName}`)
    }
}

export const assertValidId = (id: unknown) => {
    if (typeof id !== 'string' && typeof id !== 'number') {
        throw new Error('المعرف غير صالح.')
    }
    if (String(id).trim().length === 0) {
        throw new Error('المعرف فارغ.')
    }
}

export const assertValidObject = (object: unknown) => {
    if (object === null || object === undefined || typeof object !== 'object' || Array.isArray(object)) {
        throw new Error('الكائن غير صالح.')
    }
}

const ALL_STORES = [
    'licenses', 'organizations', 'branches', 'devices',
    'employees', 'roles', 'permissions', 'role_permissions', 'users', 'attendance', 'hr_transactions', 'tasks', 'task_updates',
    'clients', 'guarantors', 'client_surveys',
    'suppliers', 'supplier_performance', 'purchase_invoices', 'purchase_items', 'purchase_returns',
    'products', 'categories', 'inventory_transactions', 'inventory_audits', 'inventory_audit_items',
    'contracts', 'contract_items', 'contract_guarantors', 'installments',
    'vaults', 'payments', 'expenses', 'vault_transactions',
    'legal_documents', 'legal_cases', 'legal_attachments',
    'network_identities', 'network_credit_metrics', 'network_risk_events', 'store_reports',
    'modules', 'organization_modules',
    'delivery_zones', 'delivery_orders', 'delivery_tracking',
    'audit_logs', 'system_alerts', 'coupons', 'flash_sales', 'system_settings', 'sync_queue',
    'customers', 'invoices', 'treasury', 'purchases', 'inventory_logs', 'surveys'
]
