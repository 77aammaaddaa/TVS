import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000, // Reduced timeout to prevent infinite hanging
});

// Request Interceptor - Use localStorage token instead of Supabase
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            // Get token from localStorage (set during login)
            const token = localStorage.getItem('ecofine_auth_token');
            
            // Strictly initialize headers to prevent undefined errors
            config.headers = config.headers || {};

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            // Ignore token fetch errors on public routes
            console.warn("API Interceptor: Failed to retrieve auth token", e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: BULLETPROOF 401 HANDLER
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // 1. Remove ONLY session data – NEVER the license key
            localStorage.removeItem('ecofine_auth_token');
            localStorage.removeItem('ecofine_session');
            localStorage.removeItem('ecofine_org_id');
            // DO NOT remove ecofine_license_key — the license is still valid

            // 2. Redirect to login (NOT activation)
            const currentPath = window.location.pathname;
            const publicPaths = ['/login', '/activate', '/claim', '/forgot-password'];
            if (!publicPaths.some((p) => currentPath.includes(p))) {
                window.location.href = '/login';
            }
        }

        const errorMessage = (error.response?.data as any)?.error || 'حدث خطأ غير متوقع في الخادم';
        return Promise.reject(new Error(errorMessage));
    }
);

export default api;

// ==========================================
// API Service Modules
// ==========================================

export interface LoginResponseUser {
    id: string;
    personId: string;
    email: string;
    username: string;
    role: string;
    branchId: string | null;
    orgId: string;
    permissions: unknown;
    isSuperAdmin: boolean;
}

export interface LoginResponse {
    user: LoginResponseUser;
    session: { access_token: string; refresh_token: string };
}

export interface CheckLicenseResponse {
    license_key: string;
    is_used: boolean;
    needs_claim: boolean;
    plan_name: string | null;
    org_name?: string | null;
    owner_email?: string | null;
}

export const authAPI = {
    // `identifier` is username OR email — resolved on the backend.
    login: (data: { identifier: string; password: string; license_key: string }) =>
        api.post<LoginResponse>('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: async (): Promise<LoginResponseUser> => {
        const response = await api.get<LoginResponseUser>('/auth/me');
        return response.data;
    },
    checkLicense: (data: { license_key: string }) =>
        api.post<CheckLicenseResponse>('/auth/check-license', data),
    activateWorkspace: (data: {
        license_key: string;
        email: string;
        username: string;
        password: string;
        confirmPassword: string;
    }) => api.post<{ success: boolean }>('/auth/activate-workspace', data),
    forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
    resetOwnerPassword: (data: { userId: string; newPassword: string }) =>
        api.post('/auth/reset-owner-password', data),
};

export const superAdminAPI = {
    getLicenses: () => api.get('/sa/licenses'),
    createLicense: (data: unknown) => api.post('/sa/licenses', data),
    updateLicense: (id: string, data: unknown) => api.put(`/sa/licenses/${id}`, data),
    deleteLicense: (id: string) => api.delete(`/sa/licenses/${id}`),
    getOrganizations: () => api.get('/sa/organizations'),
    toggleOrgStatus: (id: string, data: unknown) => api.put(`/sa/organizations/${id}`, data),
    getAdmins: () => api.get('/sa/admins'),
    createAdmin: (data: { email: string; password?: string; full_name: string; phone?: string; organization_id: string }) => api.post('/sa/admins', data),
    deleteAdmin: (id: string) => api.delete(`/sa/admins/${id}`),
    getSession: () => api.get('/sa/session'),
    logout: () => api.post('/sa/logout'),
};

export const settingsAPI = {
    get: async () => {
        const response = await api.get('/settings');
        return response.data;
    },
    update: async (config: any) => {
        const response = await api.put('/settings', { config_data: config });
        return response.data;
    },
    reset: async () => {
        const response = await api.post('/settings/reset');
        return response.data;
    }
};

// ... KEEP ALL EXISTING CODE FROM HERE DOWN UNCHANGED ...
// (EmployeeRecord, usersAPI, posAPI, customersAPI, inventoryAPI, 
//  dataBridgeAPI, auditAPI, partnersAPI, purchasesAPI, purchaseReturnsAPI,
//  surveysAPI, shiftsAPI, vaultsAPI, walletsAPI, collectionsAPI,
//  suppliersAPI, vaultsManageAPI, dashboardAPI)

export interface EmployeeRecord {
    id: string;
    auth_id: string | null;
    organization_id: string;
    branch_id: string | null;
    role: string;
    username: string | null;
    phone: string | null;
    permissions: string[];
    is_active: boolean;
    created_at: string;
    person?: { full_name: string | null; national_id: string | null } | null;
}

export interface CreateEmployeePayload {
    full_name: string;
    email: string;
    username: string;
    password?: string; // omit to auto-generate a temp password server-side
    phone: string;
    role: string;
    permissions: string[];
    branch_id?: string | null;
    national_id?: string;
}

export interface UpdateEmployeePayload {
    role?: string;
    permissions?: string[];
    branch_id?: string | null;
    phone?: string;
    is_active?: boolean;
    full_name?: string;
}

export const usersAPI = {
    list: () => api.get<{ employees: EmployeeRecord[] }>('/users'),
    create: (data: CreateEmployeePayload) =>
        api.post<{
            success: boolean;
            employee: EmployeeRecord;
            credentials: { email: string; username: string; temp_password?: string };
        }>('/users', data),
    update: (id: string, data: UpdateEmployeePayload) => api.put(`/users/${id}`, data),
    resetPassword: (id: string, new_password: string) => api.put(`/users/${id}/password`, { new_password }),
    setActive: (id: string, is_active: boolean) => api.put(`/users/${id}/status`, { is_active }),
};

// ==========================================
// POS module
// ==========================================

export interface SaleItemPayload {
    product_id: string;
    quantity: number;
}

export interface CreateSalePayload {
    sale_type: 'CASH' | 'SHIPPING' | 'INSTALLMENT';
    items: SaleItemPayload[];
    customer_id?: string | null;
    shipping_fee?: number;
    down_payment?: number;
    installment_count?: number;
    notes?: string;
}

export interface SaleResult {
    success: boolean;
    contract: {
        id: string;
        sale_type: string;
        total_amount: number;
        remaining_amount: number;
        status: string;
    };
    receipt_ref: string;
}

export interface POSProduct {
    id: string;
    name: string;
    sku: string | null;
    unit: string | null;
    category_id: string | null;
    category_name: string | null;
    stock_quantity: number;
    cash_price: number;
    installment_price: number;
    cost_price: number;
}

export interface POSCategory {
    id: string;
    name: string;
}

export interface POSVault {
    id: string;
    name: string;
    balance: number;
    is_active: boolean;
}

export const posAPI = {
    listProducts: () => api.get<{ products: POSProduct[] }>('/pos/products'),
    listCategories: () => api.get<{ categories: POSCategory[] }>('/pos/categories'),
    listVaults: () => api.get<{ vaults: POSVault[] }>('/pos/vaults'),
    createSale: (data: CreateSalePayload) => api.post<SaleResult>('/pos/transactions', data),
    listSales: (params?: { branch_id?: string; sale_type?: string; from?: string; to?: string }) =>
        api.get('/pos/transactions', { params }),
};

// ==========================================
// CRM module (enhanced)
// ==========================================

export interface CustomerRecord {
    id: string;
    organization_id: string;
    branch_id: string | null;
    full_name: string;
    national_id: string | null;
    phone: string;
    address: string | null;
    monthly_income: number | null;
    credit_limit: number | null;
    credit_score: number;
    status: string;
    created_at: string;
    // Extended fields
    job?: string;
    job_type?: string;
    employer_address?: string;
    housing_type?: string;
    marital_status?: string;
    area?: string;
    city?: string;
    address_details?: string;
    bank_name?: string;
    bank_account?: string;
    iban?: string;
    notes?: string;
    internal_code?: string;
}

export interface GuarantorInput {
    full_name: string;
    national_id?: string;
    phone: string;
    relation?: string;
    job?: string;
    job_type?: string;
    monthly_income?: number;
}

export interface CustomerFormPayload {
    full_name: string;
    phone: string;
    national_id?: string;
    address?: string;
    monthly_income?: number;
    branch_id?: string | null;
    job?: string;
    job_type?: string;
    employer_address?: string;
    housing_type?: string;
    marital_status?: string;
    area?: string;
    city?: string;
    address_details?: string;
    bank_name?: string;
    bank_account?: string;
    iban?: string;
    notes?: string;
    guarantors?: GuarantorInput[];
}

export interface UpdateCustomerPayload extends Partial<CustomerFormPayload> {
    admin_password?: string;   // required only if changing national_id
}

export const customersAPI = {
    list: () => api.get<{ customers: CustomerRecord[] }>('/customers'),
    getById: (id: string) => api.get<{ customer: CustomerRecord }>(`/customers/${id}`),
    create: (data: CustomerFormPayload) =>
        api.post<{ success: boolean; customer: CustomerRecord }>('/customers', data),
    update: (id: string, data: UpdateCustomerPayload) =>
        api.put(`/customers/${id}`, data),
    getCreditProfile: (id: string) =>
        api.get<{
        customer: CustomerRecord;
        active_debt: number;
        guarantor: { full_name: string | null; phone: string | null } | null;
        }>(`/customers/${id}/credit-profile`),
};

// ==========================================
// Inventory module
// ==========================================

export interface ProductRecord {
    id: string;
    organization_id: string;
    category_id: string | null;
    name: string;
    unit: string | null;
    sku: string | null;
    stock_quantity: number;
    installment_price: number;
    cash_price: number;
    cost_price: number;
    category_name?: string | null;
}

export interface CategoryRecord {
    id: string;
    name: string;
    description: string | null;
}

export const inventoryAPI = {
    listProducts: () => api.get<{ products: ProductRecord[] }>('/inventory/products'),
    listCategories: () => api.get<{ categories: CategoryRecord[] }>('/inventory/categories'),
};

// ==========================================
// Data Bridge module (Import/Export)
// ==========================================

export const dataBridgeAPI = {
    importData: (formData: FormData) => 
        api.post<{ success: boolean; inserted: number; duplicates_skipped: number }>('/data-bridge/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),
    exportData: (table: string) => 
        api.get(`/data-bridge/export/${table}`, { responseType: 'blob' })
};

export interface AuditLogRecord {
    id: string;
    organization_id: string;
    user_id: string | null;
    action: string;
    module: string;
    details: string;
    severity: 'info' | 'warning' | 'critical';
    ip_address: string | null;
    user_agent: string | null;
    timestamp: string;
    username?: string;
}

export const auditAPI = {
    list: () => api.get<{ logs: AuditLogRecord[] }>('/audit'),
    clear: () => api.delete<{ success: boolean }>('/audit')
};

// ==========================================
// Partners & Profits module
// ==========================================

export interface PartnerRecord {
    id: string;
    current_capital: number;
    profit_share_percentage: number;
    status: string;
    created_at: string;
    lockup_end_date?: string | null;
    person?: {
        full_name: string | null;
        national_id: string | null;
        phone: string;
        address: string | null;
    } | null;
}

export interface CreatePartnerPayload {
    full_name: string;
    phone: string;
    national_id?: string;
    address?: string;
    initial_deposit: number;          // > 0
    vault_id: string;                 // selected vault
    lockup_end_date?: string;         // ISO date, optional
}

export interface TransactCapitalPayload {
    partner_id: string;
    vault_id: string;
    amount: number;
    transaction_type: 'DEPOSIT' | 'WITHDRAWAL';
}

export interface ProfitCalcResult {
    total_collected: number;
    total_expenses: number;
    net_profit: number;
}

export interface DistributePayload {
    period_start: string;
    period_end: string;
    organization_share_pct: number;
    payout_vault_id: string;
    reinvesting_partner_ids?: string[];   // NEW
}

export interface DistributionResult {
    success: boolean;
    distribution: {
        id: string;
        net_profit: number;
        organization_profit: number;
        partners_pool: number;
        payouts: { partner_id: string; amount: number }[];
    };
}

export interface LedgerEntry {
    id: string;
    date: string;
    type: string;
    amount: number;
    description: string;
}

export interface PendingWithdrawal {
    id: string;
    created_at: string;
    amount: number;
    partner_id: string;
    partner: {
        person: {
            full_name: string;
        };
    };
}

export const partnersAPI = {
    list: () => api.get<{ partners: PartnerRecord[] }>('/partners'),
    create: (data: CreatePartnerPayload) =>
        api.post<{ success: boolean; partner: PartnerRecord }>('/partners', data),
    transactCapital: (data: TransactCapitalPayload) =>
        api.post<{ success: boolean; partner: PartnerRecord }>('/partners/transactions', data),

    // New endpoints
    approveTransaction: (id: string, status: 'APPROVED' | 'REJECTED') =>
        api.put<{ success: boolean }>(`/partners/transactions/${id}/status`, { status }),
    getPendingWithdrawals: () =>
        api.get<{ pending: PendingWithdrawal[] }>('/partners/pending-withdrawals'),
    getPartnerLedger: (partnerId: string) =>
        api.get<{ ledger: LedgerEntry[] }>(`/partners/${partnerId}/ledger`),

    calculateProfits: (from: string, to: string) =>
        api.get<ProfitCalcResult>('/partners/calculate-profits', { params: { from, to } }),
    distributeProfits: (data: DistributePayload) =>
        api.post<DistributionResult>('/partners/distribute', data),
};

// ==========================================
// Purchases module
// ==========================================
export interface PurchaseItemPayload {
    product_id?: string;
    product_name?: string;
    category_name?: string;
    cash_price: number;
    installment_price?: number;
    quantity: number;
    buy_price: number;
}

export interface CreatePurchasePayload {
    supplier_id: string;
    items: PurchaseItemPayload[];
    notes?: string;
}

export interface PurchaseRecord {
    id: string;
    supplier_id: string;
    total_amount: number;
    status: string;
    outstanding_amount: number;
    amount_paid: number;
    created_at: string;
    supplier?: { name: string; phone: string };
    items?: PurchaseItemRecord[];
}
export interface PurchaseItemRecord {
    id: string;
    product_id: string;
    quantity: number;
    unit_cost: number;
    product?: { name: string };
}

export const purchasesAPI = {
    create: (data: CreatePurchasePayload) =>
        api.post<{ success: boolean; purchase: { id: string; total_amount: number; status: string } }>('/purchases', data),
    list: () =>
        api.get<{ purchases: PurchaseRecord[] }>('/purchases'),
    approve: (id: string) =>
        api.put<{ success: boolean; outstanding_amount: number }>(`/purchases/${id}/approve`),
    reject: (id: string, reason?: string) =>
        api.put<{ success: boolean }>(`/purchases/${id}/reject`, { reason }),
    settle: (id: string, vault_id: string, amount: number) =>
        api.post<{ success: boolean }>(`/purchases/${id}/settle`, { vault_id, amount }),
};

export const purchaseReturnsAPI = {
    create: (data: { purchase_invoice_id: string; items: { product_id: string; quantity: number; unit_cost: number }[] }) =>
        api.post<{ success: boolean; return: { id: string; total_amount: number } }>('/purchase-returns', data),
};

export interface SurveyAttachment {
    id: string;
    url: string;
    attachment_type: 'photo' | 'signature';
}

export interface SurveyRecord {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    is_suspicious_location: boolean;
    recommendation?: string;
    housing_quality: number;
    neighborhood_quality: number;
    income_stability: number;
    employment_status: number;
    property_ownership: number;
    overall_impression: number;
    created_at: string;
    reviewed_at?: string;
    rejection_reason?: string;
    employee?: { person: { full_name: string } };
    customer?: { id: string; full_name: string; phone: string; address: string };
    guarantor?: { id: string; full_name: string; phone: string };
    attachments?: SurveyAttachment[];
}

export interface CreateSurveyFormData {
    customer_id: string;
    guarantor_id?: string;
    new_guarantor_name?: string;
    new_guarantor_phone?: string;
    latitude: number;
    longitude: number;
    gps_accuracy?: number;
    housing_quality: number;
    neighborhood_quality: number;
    income_stability: number;
    employment_status: number;
    property_ownership: number;
    overall_impression: number;
    recommendation?: string;
    photos: File[];
    signature?: File;
}

export const surveysAPI = {
    create: (data: CreateSurveyFormData) => {
        const formData = new FormData();
        formData.append('customer_id', data.customer_id);
        if (data.guarantor_id) formData.append('guarantor_id', data.guarantor_id);
        if (data.new_guarantor_name) formData.append('new_guarantor_name', data.new_guarantor_name);
        if (data.new_guarantor_phone) formData.append('new_guarantor_phone', data.new_guarantor_phone);
        formData.append('latitude', String(data.latitude));
        formData.append('longitude', String(data.longitude));
        if (data.gps_accuracy) formData.append('gps_accuracy', String(data.gps_accuracy));
        
        formData.append('housing_quality', String(data.housing_quality));
        formData.append('neighborhood_quality', String(data.neighborhood_quality));
        formData.append('income_stability', String(data.income_stability));
        formData.append('employment_status', String(data.employment_status));
        formData.append('property_ownership', String(data.property_ownership));
        formData.append('overall_impression', String(data.overall_impression));
        if (data.recommendation) formData.append('recommendation', data.recommendation);

        data.photos.forEach((file) => formData.append('photos', file));
        if (data.signature) formData.append('signature', data.signature);

        return api.post<{ success: boolean; surveyId: string; is_suspicious: boolean }>(
        '/surveys',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
        );
    },
    list: () => api.get<{ surveys: SurveyRecord[] }>('/surveys'),
    approve: (id: string) => api.put<{ success: boolean; finalScore: number }>(`/surveys/${id}/approve`),
    reject: (id: string, reason?: string) => api.put<{ success: boolean }>(`/surveys/${id}/reject`, { reason }),
};

// ==========================================
// Shifts & Drawers Module
// ==========================================

export interface ShiftRecord {
    id: string;
    branch_id?: string;
    employee_id: string;
    vault_id: string;
    opened_at: string;
    closed_at?: string;
    starting_balance: number;
    expected_closing_balance?: number;
    actual_closing_balance?: number;
    difference_amount?: number;
    shortage_status?: string;
    transferred_to_vault?: boolean;
    status: 'OPEN' | 'CLOSED';
    notes?: string;
    employee?: { person: { full_name: string } };
    vault?: { id: string; name: string };
}

export const shiftsAPI = {
    getActive: () => api.get<{ shift: ShiftRecord | null }>('/shifts/active'),
    open: (data: { vault_id: string; starting_balance: number }) => api.post<{ success: boolean; shift: ShiftRecord }>('/shifts/open', data),
    close: (id: string, data: { actual_closing_balance: number; notes?: string }) => api.post<{ success: boolean; shift: ShiftRecord }>(`/shifts/close/${id}`, data),
    getHistory: (branch_id?: string) => api.get<{ shifts: ShiftRecord[] }>('/shifts/history', { params: { branch_id } })
};

export interface VaultRecord {
    id: string;
    name: string;
    balance: number;
    is_active: boolean;
    is_main_vault: boolean;
}

export const vaultsAPI = {
    list: () => api.get<{ vaults: VaultRecord[] }>('/vaults'),
};

// ==========================================
// Collector Wallets & Collections Module
// ==========================================

export interface WalletRecord {
    id: string;
    organization_id: string;
    employee_id: string;
    balance: number;
    status: 'OPEN' | 'CLOSED';
    opened_at: string;
    closed_at: string | null;
    starting_balance: number;
    expected_closing_balance: number | null;
    actual_closing_balance: number | null;
    shortage_status: string | null;
}

export interface WalletTransactionRecord {
    id: string;
    organization_id: string;
    wallet_id: string;
    amount: number;
    transaction_type: 'COLLECTION' | 'COMMISSION' | 'SETTLEMENT_TO_VAULT' | 'ADJUSTMENT';
    payment_id: string | null;
    description?: string | null;
    created_at: string;
}

export interface WalletSummary {
    wallet: WalletRecord;
    transactions: WalletTransactionRecord[];
    dailySummary: {
        totalCollectedToday: number;
        totalCommissionToday: number;
        totalTransactionsToday: number;
    };
}

export interface CollectionResult {
    payment: any;
    newWalletBalance: number;
}

export const walletsAPI = {
    getMyWallet: async (): Promise<WalletSummary> => {
        const res = await api.get<{ status: string; data: WalletSummary }>('/wallets/my-wallet');
        return res.data.data;
    },
    settleWallet: async (data: { wallet_id: string; actual_cash: number }) => {
        const res = await api.post<{ status: string; data: any }>('/wallets/settle', data);
        return res.data.data;
    },
    recordExpense: async (data: { wallet_id: string; amount: number; description: string }) => {
        const res = await api.post<{ status: string; data: any }>('/wallets/expense', data);
        return res.data.data;
    }
};

export const collectionsAPI = {
    recordCollection: async (data: { contract_id: string; amount: number; wallet_id: string }): Promise<CollectionResult> => {
        const res = await api.post<{ status: string; data: CollectionResult }>('/collections/record', data);
        return res.data.data;
    },
    // 👇 Add this new method
    getPendingInstallments: async () => {
        const res = await api.get<{ status: string; data: any[] }>('/collections/installments');
        return res.data.data;
    }
};

// ==========================================
// Suppliers module
// ==========================================

export interface SupplierRecord {
    id: string;
    name: string;
    phone: string;
    address?: string;
    category?: string;
    is_active?: boolean;
    created_at: string;
}

export interface CreateSupplierPayload {
    name: string;
    phone: string;
    address?: string;
    category?: string;
}

export interface UpdateSupplierPayload {
    name?: string;
    phone?: string;
    address?: string;
    category?: string;
}

export interface SupplierStatement {
    invoices: PurchaseRecord[];
    totalOutstanding: number;
}

export const suppliersAPI = {
    list: (search?: string) =>
        api.get<{ suppliers: SupplierRecord[] }>('/suppliers', { params: { search } }),
    create: (data: CreateSupplierPayload) =>
        api.post<{ success: boolean; supplier: SupplierRecord }>('/suppliers', data),
    update: (id: string, data: UpdateSupplierPayload) =>
        api.put<{ success: boolean; supplier: SupplierRecord }>(`/suppliers/${id}`, data),
    deactivate: (id: string) =>
        api.patch<{ success: boolean }>(`/suppliers/${id}/deactivate`),
    getStatement: (id: string) =>
        api.get<SupplierStatement>(`/suppliers/${id}/statement`),
};

// ==========================================
// SUPPLIER STATEMENT (NEW)
// ==========================================

// ==========================================
// Vaults Management module
// ==========================================
export const vaultsManageAPI = {
    list: () => api.get<{ vaults: VaultRecord[] }>('/vaults/manage'),
    create: (data: { name: string }) =>
        api.post<{ success: boolean; vault: VaultRecord }>('/vaults/manage', data),
    update: (id: string, data: { name?: string; is_active?: boolean }) =>
        api.put<{ success: boolean; vault: VaultRecord }>(`/vaults/manage/${id}`, data),
    transfer: (data: { source_vault_id: string; destination_vault_id: string; amount: number; description?: string }) =>
        api.post<{ success: boolean }>('/vaults/manage/transfer', data),
    getLedger: (vaultId: string, params?: { from?: string; to?: string; transaction_type?: string }) =>
        api.get<{ transactions: any[] }>(`/vaults/manage/${vaultId}/ledger`, { params }),
};

// Add these interfaces near your others:
export interface HomeDashboardData {
    role: string;
    cashier?: { activeShift: any; todaySales: number };
    collector?: { walletBalance: number; todayCollections: number };
    warehouse?: { lowStockCount: number };
}

export interface GoldenDashboardData {
    financials: {
        totalCash: number;
        totalVaultCash: number;
        totalWalletCash: number;
        totalReceivables: number;
        totalPayables: number;
        netLiquidity: number;
    };
    chartData: Array<{ name: string; revenue: number; expense: number }>;
}

// Add this object:
export const dashboardAPI = {
    getHomeData: async (): Promise<HomeDashboardData> => {
        const res = await api.get<{ status: string; data: HomeDashboardData }>('/dashboard/home');
        return res.data.data;
    },
    getGoldenData: async (): Promise<GoldenDashboardData> => {
        const res = await api.get<{ status: string; data: GoldenDashboardData }>('/dashboard/golden');
        return res.data.data;
    }
};