Here is the complete, production-ready `README.md` file, perfectly formatted for your GitHub repository. It is designed to be the single source of truth for any new developer, stakeholder, or contributor joining the EcoFin Pro project.

---

```markdown
# 🚀 EcoFin Pro | Enterprise SaaS ERP & POS

![Version](https://img.shields.io/badge/version-15.0-blue.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-green.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Tech](https://img.shields.io/badge/tech-React%20%7C%20Express%20%7C%20Supabase-orange.svg)

**EcoFin Pro** is a high-performance, **offline-first** Enterprise Resource Planning (ERP) and Point of Sale (POS) system. Designed specifically for retail, Murabaha (installment) tracking, and multi-branch management, it ensures absolute business continuity even during internet outages.

It utilizes a modern **Hybrid Architecture**: a React frontend with a local IndexedDB engine for zero-latency UI, paired with a secure Express.js backend and Supabase (PostgreSQL) for atomic transactions, strict Row Level Security (RLS), and intelligent background cloud synchronization.

---

## 📑 Table of Contents
- [🌟 Key Features](#-key-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🛠️ Technology Stack](#️-technology-stack)
- [⚙️ Getting Started](#️-getting-started)
- [🔐 Critical Developer Rules](#-critical-developer-rules)
- [🔄 Core Workflows](#-core-workflows)
- [🧪 Testing & Debugging](#-testing--debugging)
- [🤝 Contributing](#-contributing)

---

## 🌟 Key Features

* **📶 Offline-First Architecture:** Built on a robust IndexedDB local engine. Cashiers can process sales, add clients, and manage inventory without an active internet connection.
* **☁️ Intelligent Cloud Sync:** A background sync engine (`useCloudSync`) that silently pushes local transactions to the cloud and pulls updates the moment connectivity is restored.
* **🏢 Multi-Tenant SaaS Ready:** Powered by a Single-Database, Shared-Schema architecture with strict PostgreSQL Row Level Security (RLS) to ensure absolute data isolation between organizations.
* **🧠 Smart POS & X-Core Risk Engine:** A dynamic checkout system that automatically calculates credit limits, mandatory down-payments, and installment schedules based on customer financial profiles.
* **👥 Comprehensive CRM:** Track customer credit scores, guarantor details, and active debt in real-time.
* **💰 Treasury & Collections:** Full visibility into vault balances, daily expenses, and automated tracking for pending or late installments.
* **🛡️ Enterprise Security:** Express.js API gateway with strict input validation, rate limiting, and Supabase Magic Link password recovery (no fragile custom OTP systems).

---

## 🏗️ System Architecture

The application operates on a secure **4-Tier Data Model**:

1. **The UI Layer (React):** Reads and writes primarily to the local database, guaranteeing zero-latency interactions for cashiers and staff.
2. **The Local Engine (IndexedDB):** Acts as the primary data store and "outbox" for the active session. Handles offline queuing and local state.
3. **The API Gateway (Express.js):** The source of truth for all critical business mutations (e.g., Contract Creation, Payments, Shift Management). Enforces strict input validation, RBAC, and business logic before touching the database.
4. **The Cloud Vault (Supabase):** The central source of truth. Features PostgreSQL Row Level Security (RLS) and database-level triggers (e.g., auto-updating vault balances and inventory stock) to guarantee data integrity, regardless of whether the write comes from the Express API or the background sync engine.

---

## 🛠️ Technology Stack

### Frontend (`/client`)
* **Framework:** React 18, TypeScript, Vite
* **State & Routing:** React Router v6, Context API
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Local Storage:** IndexedDB (Custom wrapper in `src/lib/database.ts`)
* **HTTP Client:** Axios (with automatic JWT interceptor in `src/services/api.ts`)
* **Hardware:** HTML5 QR/Barcode Scanner integration

### Backend (`/server`)
* **Runtime:** Node.js, Express.js, TypeScript
* **Database Client:** `@supabase/supabase-js` (Service Role)
* **Security:** `helmet` (HTTP headers), `express-rate-limit`, `bcryptjs`
* **Validation:** Custom shared validation engine (`src/utils/validation.ts`)

### Database & Infrastructure
* **Database:** PostgreSQL (via Supabase)
* **Auth:** Supabase Auth (Email/Password + Magic Link Password Reset)
* **Security:** Strict Row Level Security (RLS) policies on all tenant tables.
* **Integrity:** PostgreSQL Triggers for atomic stock and treasury updates.

---

## ⚙️ Getting Started

### 1. Prerequisites
* Node.js (v18+)
* PostgreSQL client (or access to Supabase Dashboard)
* A Supabase Project

### 2. Clone & Install
```bash
git clone https://github.com/your-username/ecofin-pro.git
cd ecofin-pro

# Install Frontend Dependencies
cd client
npm install

# Install Backend Dependencies
cd ../server
npm install
```

### 3. Environment Configuration
Create `.env` files in **both** directories based on these templates:

**`client/.env`**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000/api
```

**`server/.env`**
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # CRITICAL for backend ops
FRONTEND_URL=http://localhost:5173
```

### 4. Database Initialization
1. Go to your Supabase Dashboard → **SQL Editor**.
2. Run the **Master Schema Script** (provided in the team wiki) to create all tables, indexes, RLS policies, and triggers.
3. **Seed the Super Admin:** Run the provided `SUPER ADMIN SEEDING SCRIPT` to create the `EcoFin Pro HQ` organization and the `SAAS-MASTER-001` license key. *(Without this, you will be locked out of the `/activate` gate during local development).*

### 5. Run the Development Servers
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd clien
```

---

## 🔐 Critical Developer Rules (Read Before Coding)

1. **The 1:1 Relationship Rule:** Tables like `employees`, `customers`, `guarantors`, `suppliers`, and `super_admins` **do not have a `person_id` column**. Their `id` column *is* the foreign key referencing `persons(id)`. Always use `id` when querying or inserting.
2. **Never Trust the Client:** All business logic (pricing, credit limits, inventory deduction) must be validated on the Express backend. Frontend validation is for UX only.
3. **Respect the Triggers:** Do not manually update `vaults.balance` or `products.stock_quantity` in your API code. The database triggers (`process_payment_to_vault`, `update_product_stock`) handle this automatically to ensure offline sync consistency.
4. **RLS is the Ultimate Boundary:** Every tenant-scoped table has an `organization_id`. RLS policies ensure users can only access data where `organization_id = get_user_org_id()`. Super admins bypass this via the `is_super_admin()` helper.
5. **No Custom OTP:** The legacy MFA/OTP system has been removed. Password resets now use Supabase's native, secure Magic Link flow.

---

## 🔄 Core Workflows

### 1. The Activation Gate
1. New users (or new machines) land on `/activate`.
2. They must enter a valid License Key (e.g., `SAAS-MASTER-001`).
3. If `is_used === true`, the key is saved to `localStorage` (`ecofine_license_key`, `ecofine_org_id`), and the user is redirected to `/login`.
4. If `is_used === false`, the user is redirected to `/signup` to claim the key and create their organization.

### 2. Super Admin Onboarding
1. Super Admin logs in via `/login` (bypasses MFA, routes to `/sa`).
2. Navigates to "التراخيص" (Licenses).
3. Fills out the Org + Owner details.
4. Backend atomically creates: Auth User, Organization, Person, Employee, Branch, Vault, and a unique License Key.
5. The UI displays the generated License Key and temporary password for the Super Admin to hand over to the client.

### 3. Offline-First POS Sale
1. Cashier adds items to cart in `POSPage`.
2. On checkout, the frontend sends a payload to `POST /api/contracts/create`.
3. Express validates the payload, checks permissions, and executes the transaction.
4. Database triggers automatically deduct inventory and update the vault balance.
5. The frontend updates the local IndexedDB to reflect the new state instantly.

---

## 🧪 Testing & Debugging

* **Frontend Errors:** Check the browser console. The Axios interceptor will log network errors and automatically clear `localStorage` on 401 (Unauthorized) responses.
* **Backend Errors:** Check the Node.js terminal. The `auth.ts` and `contracts.ts` routes contain detailed `console.log` statements for debugging RLS or validation failures.
* **Database Verification:** Always verify complex operations by checking the Supabase Table Editor to ensure triggers fired correctly (e.g., check if `vaults.balance` increased after a payment).

---

## 🤝 Contributing

1. **Branching:** Create feature branches from `main` (e.g., `feature/shift-management`).
2. **Validation:** Any new API endpoint *must* include validation using the rules in `server/src/utils/validation.ts`.
3. **RLS:** Any new database table *must* have an `organization_id` and corresponding RLS policies added to the master schema script.
4. **Pull Requests:** Ensure the offline sync flow is not broken by your changes. Test with the network disconnected.

---

*For architectural questions, database schema scripts, or access to the internal team wiki, please contact the Lead Engineer.*
```

### 💡 Why this README is effective:
1. **Professional Badges:** Immediately establishes credibility and project status.
2. **Clear Table of Contents:** Allows developers to jump straight to the section they need (e.g., "Critical Developer Rules").
3. **Actionable Setup:** Provides copy-pasteable terminal commands and exact `.env` templates.
4. **Prevents Common Pitfalls:** The "Critical Developer Rules" section explicitly calls out the `1:1 Relationship` and `Trigger` rules, saving new devs hours of debugging.
5. **Workflow Context:** Explains *how* the app is actually used (Activation -> Login -> POS), giving context to the code they will be reading. 