C4Container
title Eco Fine Pro (TVS Project) - High-Level Architecture Overview

Container_Ext("User", "User", "End-user interacting with the application")

Container_Boundary(webapp_boundary, "Eco Fine Pro Web Application") {
    Container(frontend, "Frontend App", "React SPA with Tailwind CSS, transpiled by Babel in browser", "HTML, CSS, JavaScript (JSX)")
    Container(local_db, "Local Database", "IndexedDB for offline data persistence (all modules)", "Native IndexedDB")
    Container(xcore_logic, "XCore Logic", "Core business rules, credit scoring, financial calculations, legal monitoring", "JavaScript (XCore.js)")
    Container(xconfig, "XConfig Manager", "Centralized system configuration, business policies, feature toggles", "JavaScript (XConfig.js)")
    Container(modules, "Business Modules", "Modular components (HR, CRM, Inventory, POS, Accounting, Legal, etc.)", "JavaScript Modules")
    Container(sync_engine, "Sync Engine", "Manages two-way data synchronization between Local DB and Cloud Backend", "JavaScript (ecofine/database.js, XSync.js)")
}

Container_Boundary(cloud_boundary, "Supabase Cloud Backend") {
    Container(master_supabase, "Master Supabase", "Centralized platform for License Management, EcoCredit Network scores, global configurations", "PostgreSQL, Supabase Auth, Storage")
    Container(tenant_supabase, "Tenant Supabase (per Client)", "Dedicated database for client's operational data (products, sales, users, etc.)", "PostgreSQL, Supabase Auth, Storage")
}

Container_Ext(excel_importer, "Excel Importer", "Handles import of Excel/CSV files for inventory and other data", "SheetJS Library")
Container_Ext(analytics, "Analytics", "Google Analytics for usage tracking", "Google Analytics")

Rel(User, frontend, "Uses", "HTTP/S")
Rel(frontend, local_db, "Reads/Writes data via", "IndexedDB API")
Rel(frontend, xcore_logic, "Invokes business logic in")
Rel(frontend, xconfig, "Retrieves configurations from")
Rel(frontend, modules, "Renders and interacts with")

Rel(sync_engine, local_db, "Reads/Writes local data from/to")
Rel(sync_engine, tenant_supabase, "Pushes/Pulls operational data to/from", "HTTPS (Supabase Client SDK)")
Rel(xconfig, master_supabase, "Configures Tenant Supabase connection using keys from", "HTTPS (Activation/Licensing)")
Rel(master_supabase, User, "Provides license and tenant-specific cloud access to")
Rel(tenant_supabase, User, "Stores client-specific data for")

Rel(xcore_logic, xconfig, "Applies policies from")
Rel(xcore_logic, local_db, "Accesses data for decisions (e.g., guarantor eligibility)")

Rel(excel_importer, local_db, "Imports data into")
Rel(frontend, analytics, "Sends usage data to")

'note over User, analytics: Optional
note over xconfig, master_supabase: Tenant-specific Supabase credentials fetched via Activation
note over xcore_logic, master_supabase: May query master network for global credit scores/risk data
note left of local_db: Offline-first storage



Container_Boundary(core_app_boundary, "Core POS (Potentially Legacy/Lite)") {
    Container(core_frontend, "Core Frontend", "Vanilla JS, DOM manipulation, Tailwind CSS", "HTML, CSS, JavaScript")
    Container(core_local_db, "Core Local Database", "Dexie.js (IndexedDB wrapper)", "Dexie.js")
    Container(core_superadmin, "Core Super Admin", "Manages licenses and basic system functions", "JavaScript")
}

Rel(User, core_frontend, "Uses", "HTTP/S")
Rel(core_frontend, core_local_db, "Reads/Writes data via", "Dexie.js API")
Rel(core_superadmin, master_supabase, "Manages licenses on", "HTTPS (Supabase Client SDK)")