## Eco Fine Pro (TVS Project) - Architectural Overview

This project consists of two distinct application directories: `core` and `ecofine`. The `ecofine` directory appears to house the primary, actively developed enterprise-grade application (Eco Fine Pro), while the `core` directory seems to contain an older, simpler, or "lite" version of a Point of Sale (POS) system. There's significant overlap in functionality (POS, super admin, database interaction) but with different implementations, suggesting that `ecofine` is the current strategic direction.

### 1. `ecofine` Application Architecture (Eco Fine Pro)

The `ecofine` application is a comprehensive, modular Enterprise Resource Planning (ERP) and Credit System built as a Single-Page Application (SPA).

*   **Frontend (User Interface)**:
    *   Built with **React** (`react.production.min.js`, `react-dom.production.min.js`) for a dynamic and component-based user interface.
    *   Styled using **Tailwind CSS** (`cdn.tailwindcss.com`).
    *   Uses **Babel Standalone** (`babel.min.js`) for in-browser JSX/ES6 transpilation, enabling modern JavaScript features directly in the browser.
    *   Structured into numerous modules (e.g., CRM, HR, Inventory, POS, Accounting, Legal, etc.) loaded as separate JavaScript files (`<script type="text/babel" src="..."></script>`).
    *   Includes a splash screen and PWA-ready meta tags.

*   **Local Data Persistence (Offline-First)**:
    *   Utilizes **Native IndexedDB** (`ecofine/database.js`) as the primary local data store.
    *   Maintains an extensive schema with dedicated object stores for all enterprise entities (e.g., `employees`, `clients`, `products`, `contracts`, `installments`, `vaults`, `audit_logs`, `sync_queue`).
    *   Designed to work fully offline, storing all operational data locally.

*   **Cloud Backend (Multi-Tenant SaaS with Supabase)**:
    *   Integrates with **Supabase** (`supabase-js` SDK) as the cloud backend.
    *   Employs a **multi-tenant SaaS architecture**: the `reInitialize` function in `ecofine/database.js` dynamically configures the Supabase client (`window._supabase`) using `tenantUrl` and `tenantKey` fetched through the licensing mechanism. This implies each client/tenant connects to their own (or logically isolated) Supabase instance.
    *   Also interacts with a **"Master Supabase"** (configured in `ecofine/XConfig.js` and used by `ecofine/activation.js`) for centralized license management, global credit network scoring, and reporting of defaulters.

*   **Business Logic Layer (`XCore`)**:
    *   The `ecofine/XCore.js` file serves as the 