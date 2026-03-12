/**
 * 🗄️ database.js - المحرك الهجين (Enterprise SaaS Edition V14.0)
 * النظام: Eco Fine Pro | المطور: Techno Vision Solutions (Mr. X)
 * التحديث: الترقية إلى V3.0 (Multi-Tenant, Contracts, Vaults, Delivery)
 */

const db = {
    localDb: null,
    dbName: "EcoFine_Local_DB",

    // ==========================================
    // 1. إعادة التهيئة الديناميكية (SaaS Routing) 🚀
    // يتم استدعاؤها من app.js بعد تفعيل كود المؤسسة
    // ==========================================
    reInitialize: async function(tenantUrl, tenantKey) {
        if (!tenantUrl || !tenantKey) {
            console.error("❌ بيانات السحابة مفقودة، لا يمكن التهيئة.");
            return false;
        }
        
        // حقن عميل سوبابيز في الذاكرة العامة ليعمل على قاعدة بيانات العميل الحالي
        window._supabase = supabase.createClient(tenantUrl, tenantKey);
        console.log("🔄 تم توجيه محرك البيانات بنجاح إلى سحابة المؤسسة.");

        // تشغيل التهيئة المحلية ثم سحب البيانات
        await this.init();
        if (navigator.onLine) {
            await this.pullAllFromCloud();
        }
        return true;
    },

    // ==========================================
    // 2. تهيئة القواعد المحلية (IndexedDB)
    // ==========================================
    init: async function() {
        return new Promise((resolve, reject) => {
            // ⚠️ تم رفع الإصدار إلى 14 لإجبار المتصفح على إنشاء الجداول الجديدة الخاصة بـ V3.0
            const request = indexedDB.open(this.dbName, 14);

            request.onupgradeneeded = (event) => {
                const local = event.target.result;
                
                // 📦 قائمة جميع الجداول الشاملة للنظام (V3.0) مع الجداول التسويقية القديمة
                const allStores = [
                    // Layer 0: Foundation
                    'licenses', 'organizations', 'branches', 'devices',
                    // Module 1: HR
                    'employees', 'roles', 'permissions', 'role_permissions', 'users', 'attendance', 'hr_transactions', 'tasks', 'task_updates',
                    // Module 2: CRM
                    'clients', 'guarantors', 'client_surveys',
                    // Module 3: Suppliers
                    'suppliers', 'supplier_performance', 'purchase_invoices', 'purchase_items', 'purchase_returns',
                    // Module 4: Inventory
                    'products', 'categories', 'inventory_transactions', 'inventory_audits', 'inventory_audit_items',
                    // Module 5: Contracts & Installments (Replaces invoices)
                    'contracts', 'contract_items', 'contract_guarantors', 'installments',
                    // Module 6: Treasury (Replaces old treasury)
                    'vaults', 'payments', 'expenses', 'vault_transactions',
                    // Module 7: Legal
                    'legal_documents', 'legal_cases', 'legal_attachments',
                    // Module 8: EcoCredit
                    'network_identities', 'network_credit_metrics', 'network_risk_events', 'store_reports',
                    // Module 9: Modules
                    'modules', 'organization_modules',
                    // Module 10: Delivery
                    'delivery_zones', 'delivery_orders', 'delivery_tracking',
                    // Audit, Alerts & Marketing (Legacy kept)
                    'audit_logs', 'system_alerts', 'coupons', 'flash_sales', 'system_settings', 'sync_queue',
                    // ⚠️ إبقاء القديم للنسخ الاحتياطي تحسباً لأي بيانات لم يتم ترحيلها
                    'customers', 'invoices', 'treasury', 'purchases', 'inventory_logs', 'surveys'
                ];

                // إنشاء الجداول ديناميكياً لتنظيف الكود
                allStores.forEach(storeName => {
                    if (!local.objectStoreNames.contains(storeName)) {
                        // نعطي sync_queue و audit_logs و alerts ميزة الزيادة التلقائية
                        if (['sync_queue', 'audit_logs', 'system_alerts'].includes(storeName)) {
                            local.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                        } else {
                            local.createObjectStore(storeName, { keyPath: 'id' });
                        }
                    }
                });
            };

            request.onsuccess = (event) => {
                this.localDb = event.target.result;
                console.log("✅ المحرك المحلي جاهز للعمل (IndexedDB V14 Active)");
                
                // محاولة مزامنة السجلات المعلقة إن وُجدت السحابة
                this.syncWithCloud();
                resolve(true);
            };

            request.onerror = () => reject("❌ فشل تشغيل المستودع المحلي");
        });
    },

    // ==========================================
    // 3. العمليات الأساسية (CRUD) الهجينة
    // ==========================================
    add: async function(tableName, object) {
        if (!object.id) object.id = crypto.randomUUID();
        object.last_updated = new Date().toISOString();
        object.synced = false;

        // الحفظ محلياً أولاً (Offline First)
        await this._toLocal(tableName, object);

        // الدفع للسحابة إذا كان متصلاً والمؤسسة مفعلة
        if (navigator.onLine && window._supabase) {
            try {
                const { error } = await window._supabase.from(tableName).upsert([object]);
                if (!error) {
                    object.synced = true;
                    await this._toLocal(tableName, object);
                }
            } catch (e) { console.warn(`☁️ تعذر رفع السجل لجدول ${tableName}، سيتم مزامنته لاحقاً.`); }
        }
        return object;
    },

    update: async function(tableName, id, updates) {
        const existing = await this.getById(tableName, id);
        if (!existing) throw new Error("السجل غير موجود محلياً");

        const updatedObject = { ...existing, ...updates, last_updated: new Date().toISOString(), synced: false };
        await this._toLocal(tableName, updatedObject);
        
        if (navigator.onLine && window._supabase) {
            try {
                const { error } = await window._supabase.from(tableName).upsert([updatedObject]);
                if (!error) {
                    updatedObject.synced = true;
                    await this._toLocal(tableName, updatedObject);
                }
            } catch (e) { console.warn("☁️ تعذر تحديث السحابة، مجدول للمزامنة."); }
        }
        return updatedObject;
    },

    delete: async function(tableName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDb.transaction(tableName, "readwrite");
            const store = transaction.objectStore(tableName);
            const request = store.delete(id);
            
            request.onsuccess = async () => {
                if (navigator.onLine && window._supabase) {
                    try {
                        await window._supabase.from(tableName).delete().eq('id', id);
                    } catch (e) { console.warn("☁️ لم يتم الحذف سحابياً، سيتم تجاهله أو تنظيفه لاحقاً."); }
                }
                resolve(true);
            };
            request.onerror = () => reject("❌ فشل الحذف المحلي");
        });
    },

    // ==========================================
    // 4. جلب البيانات (يتم دائماً من المحلي لضمان السرعة)
    // ==========================================
    getAll: async function(tableName) {
        return new Promise((resolve) => {
            const transaction = this.localDb.transaction(tableName, "readonly");
            const store = transaction.objectStore(tableName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    },

    getById: async function(tableName, id) {
        return new Promise((resolve) => {
            const transaction = this.localDb.transaction(tableName, "readonly");
            const store = transaction.objectStore(tableName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
        });
    },

    getByIndex: async function(tableName, indexName, value) {
        const allRecords = await this.getAll(tableName);
        return allRecords.find(record => record[indexName] === value) || null;
    },

    // ==========================================
    // 5. محرك المزامنة (Push) - يرفع التغييرات المحلية
    // ==========================================
    syncWithCloud: async function() {
        if (!navigator.onLine || !window._supabase) return;

        // تم الترتيب لتجنب أخطاء الـ Foreign Keys في السحابة (الأساسي أولاً ثم العمليات)
        const tablesToPush = [
            'branches', 'employees', 'roles', 'users', 'categories', 'suppliers', 'products', 
            'clients', 'guarantors', 'vaults', 'contracts', 'contract_items', 'installments', 
            'payments', 'vault_transactions', 'expenses', 'inventory_transactions', 
            'delivery_orders', 'delivery_tracking', 'tasks', 'task_updates',
            'legal_cases', 'legal_documents', 'coupons', 'flash_sales', 'system_alerts'
        ];
        
        for (const table of tablesToPush) {
            try {
                if (!this.localDb.objectStoreNames.contains(table)) continue;
                
                const allLocal = await this.getAll(table);
                const unSynced = allLocal.filter(item => !item.synced);

                for (const item of unSynced) {
                    try {
                        const { error } = await window._supabase.from(table).upsert([item]);
                        if (!error) {
                            item.synced = true;
                            await this._toLocal(table, item);
                        } else {
                            console.error(`❌ خطأ مزامنة في ${table}:`, error.message);
                            continue; 
                        }
                    } catch (e) { 
                        break; 
                    }
                }
            } catch (err) {
                console.warn(`⚠️ تعذر الوصول لجدول ${table}:`, err.message);
            }
        }
        console.log("☁️ دورة المزامنة السحابية (Push) اكتملت.");
    },

    // ==========================================
    // 6. محرك استرجاع البيانات (Pull) - للأجهزة الجديدة أو التحديث
    // ==========================================
    pullAllFromCloud: async function() {
        if (!navigator.onLine || !window._supabase) {
            console.warn("⚠️ السحابة غير جاهزة، لا يمكن سحب البيانات الآن.");
            return false;
        }

        // ترتيب السحب أيضاً يعطي الأولوية للبيانات الأساسية لضمان سلامة الربط المحلي
        const tablesToPull = [
            'branches', 'employees', 'roles', 'users', 'categories', 'suppliers', 'products', 
            'clients', 'guarantors', 'vaults', 'contracts', 'contract_items', 'installments', 
            'payments', 'vault_transactions', 'expenses', 'inventory_transactions', 
            'delivery_orders', 'tasks', 'legal_cases', 'coupons', 'flash_sales', 'system_alerts', 'system_settings'
        ];

        console.log("📥 جاري سحب أحدث البيانات من سحابة المؤسسة (V14.0)...");
        for (const table of tablesToPull) {
            try {
                if (!this.localDb.objectStoreNames.contains(table)) continue;
                
                const { data, error } = await window._supabase.from(table).select('*');
                if (error) throw error;
                
                if (data && data.length > 0) {
                    for (const item of data) {
                        item.synced = true; 
                        await this._toLocal(table, item);
                    }
                }
            } catch (err) {
                console.warn(`❌ فشل سحب بيانات ${table}:`, err.message);
            }
        }
        console.log("✅ اكتمل سحب البيانات بنجاح، النظام الآن محدث!");
        return true;
    },

    // ==========================================
    // دوال مساعدة
    // ==========================================
    _toLocal: async function(tableName, object) {
        return new Promise((resolve) => {
            const transaction = this.localDb.transaction(tableName, "readwrite");
            const store = transaction.objectStore(tableName);
            store.put(object);
            transaction.oncomplete = () => resolve(true);
        });
    }
};

window.db = db;
