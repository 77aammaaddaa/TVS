-- SQLite schema for EcoFine Pro
-- Generated based on IndexedDB structure in ecofine/database.js

-- Foundation tables
CREATE TABLE licenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    issued_at DATETIME,
    expires_at DATETIME
);

CREATE TABLE organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT
);

CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name TEXT NOT NULL,
    location TEXT,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    branch_id TEXT,
    type TEXT,
    serial_number TEXT UNIQUE,
    status TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- HR tables
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    branch_id TEXT,
    role_id TEXT,
    hire_date DATETIME,
    status TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE role_permissions (
    role_id TEXT,
    permission_id TEXT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    date DATE,
    status TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE hr_transactions (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    type TEXT,
    amount REAL,
    date DATETIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    due_date DATE,
    status TEXT,
    FOREIGN KEY (assigned_to) REFERENCES employees(id)
);

CREATE TABLE task_updates (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    update_text TEXT,
    updated_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- CRM tables
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    contact_info TEXT,
    branch_id TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE guarantors (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE client_surveys (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    survey_data TEXT,
    date DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Suppliers tables
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info TEXT,
    branch_id TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE supplier_performance (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    rating REAL,
    last_evaluated DATE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_invoices (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    invoice_number TEXT UNIQUE,
    amount REAL,
    date DATETIME,
    status TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    unit_price REAL,
    FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE purchase_returns (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    reason TEXT,
    date DATETIME,
    FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Inventory tables
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT,
    sku TEXT UNIQUE,
    price REAL,
    stock INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    quantity INTEGER,
    type TEXT,
    date DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE inventory_audits (
    id TEXT PRIMARY KEY,
    audit_date DATE,
    performed_by TEXT,
    notes TEXT
);

CREATE TABLE inventory_audit_items (
    id TEXT PRIMARY KEY,
    audit_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    FOREIGN KEY (audit_id) REFERENCES inventory_audits(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Contracts & Installments tables
CREATE TABLE contracts (
    id TEXT PRIMARY KEY,
    client_id TEXT,
    supplier_id TEXT,
    contract_number TEXT UNIQUE,
    start_date DATE,
    end_date DATE,
    total_amount REAL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE contract_items (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    unit_price REAL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE contract_guarantors (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    guarantor_id TEXT,
    FOREIGN KEY (contract_id) REFERENCES contracts(id),
    FOREIGN KEY (guarantor_id) REFERENCES guarantors(id)
);

CREATE TABLE installments (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    amount REAL,
    due_date DATE,
    paid BOOLEAN DEFAULT 0,
    FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

-- Treasury tables
CREATE TABLE vaults (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    vault_id TEXT,
    amount REAL,
    date DATETIME,
    FOREIGN KEY (vault_id) REFERENCES vaults(id)
);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    vault_id TEXT,
    amount REAL,
    description TEXT,
    date DATETIME,
    FOREIGN KEY (vault_id) REFERENCES vaults(id)
);

CREATE TABLE vault_transactions (
    id TEXT PRIMARY KEY,
    vault_id TEXT,
    type TEXT,
    amount REAL,
    date DATETIME,
    FOREIGN KEY (vault_id) REFERENCES vaults(id)
);

-- Legal tables
CREATE TABLE legal_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE legal_cases (
    id TEXT PRIMARY KEY,
    document_id TEXT,
    case_number TEXT UNIQUE,
    status TEXT,
    opened_date DATE,
    closed_date DATE,
    FOREIGN KEY (document_id) REFERENCES legal_documents(id)
);

CREATE TABLE legal_attachments (
    id TEXT PRIMARY KEY,
    case_id TEXT,
    file_path TEXT,
    uploaded_at DATETIME,
    FOREIGN KEY (case_id) REFERENCES legal_cases(id)
);

-- EcoCredit tables
CREATE TABLE network_identities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    identity_type TEXT
);

CREATE TABLE network_credit_metrics (
    id TEXT PRIMARY KEY,
    identity_id TEXT,
    credit_score REAL,
    last_updated DATE,
    FOREIGN KEY (identity_id) REFERENCES network_identities(id)
);

CREATE TABLE network_risk_events (
    id TEXT PRIMARY KEY,
    identity_id TEXT,
    event_type TEXT,
    description TEXT,
    date DATETIME,
    FOREIGN KEY (identity_id) REFERENCES network_identities(id)
);

CREATE TABLE store_reports (
    id TEXT PRIMARY KEY,
    report_date DATE,
    data TEXT
);

-- Modules tables
CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE organization_modules (
    organization_id TEXT,
    module_id TEXT,
    PRIMARY KEY (organization_id, module_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (module_id) REFERENCES modules(id)
);

-- Delivery tables
CREATE TABLE delivery_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT
);

CREATE TABLE delivery_orders (
    id TEXT PRIMARY KEY,
    zone_id TEXT,
    customer_id TEXT,
    order_date DATE,
    status TEXT,
    FOREIGN KEY (zone_id) REFERENCES delivery_zones(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE delivery_tracking (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    location TEXT,
    timestamp DATETIME,
    status TEXT,
    FOREIGN KEY (order_id) REFERENCES delivery_orders(id)
);

-- Audit, Alerts & Marketing tables
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    user_id TEXT,
    timestamp DATETIME,
    details TEXT
);

CREATE TABLE system_alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,
    message TEXT,
    severity TEXT,
    created_at DATETIME
);

CREATE TABLE coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    discount REAL,
    expiry DATE
);

CREATE TABLE flash_sales (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    discount REAL
);

CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- insert/update/delete
    payload TEXT,
    synced BOOLEAN DEFAULT 0,
    last_updated DATETIME
);

-- Legacy tables (kept for compatibility)
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    contact_info TEXT
);

CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    amount REAL,
    date DATETIME,
    status TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE treasury (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount REAL,
    date DATETIME
);

CREATE TABLE purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    product_id TEXT,
    quantity INTEGER,
    unit_price REAL,
    total_amount REAL,
    date DATETIME,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE inventory_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    change INTEGER,
    reason TEXT,
    timestamp DATETIME,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE surveys (
    id TEXT PRIMARY KEY,
    respondent_id TEXT,
    survey_data TEXT,
    date DATETIME
);

-- Indexes for synchronization and search
CREATE INDEX idx_sync_queue_synced ON sync_queue(synced);
CREATE INDEX idx_sync_queue_last_updated ON sync_queue(last_updated);

CREATE INDEX idx_customers_synced ON customers(synced);
CREATE INDEX idx_invoices_synced ON invoices(synced);
CREATE INDEX idx_contracts_synced ON contracts(synced);
CREATE INDEX idx_installments_synced ON installments(synced);
CREATE INDEX idx_payments_synced ON payments(synced);
CREATE INDEX idx_tasks_synced ON tasks(synced);

CREATE UNIQUE INDEX idx_clients_national_id ON clients(national_id);
CREATE UNIQUE INDEX idx_guarantors_national_id ON guarantors(national_id);
CREATE UNIQUE INDEX idx_customers_national_id ON customers(national_id);
CREATE UNIQUE INDEX idx_employees_national_id ON employees(national_id);
