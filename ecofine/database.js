/**
 * 🗄️ database.js - المحرك الهجين (Enterprise SaaS Edition V14.1)
 * النظام: Eco Fine Pro | المطور: Techno Vision Solutions (Mr. X)
 * التحديث: تحسينات استقرار، فهرسة أفضل، معالجة أخطاء متقدمة، مع الحفاظ على التوافق الكامل مع V14.0
 */

// التحقق من بيئة IndexedDB
if (!window.indexedDB) {
    console.error("❌ متصفحك لا يدعم IndexedDB. لن يعمل التخزين المحلي.");
}

const db = {
    localDb: null,
    dbName: "EcoFine_Local_DB",
    dbVersion: 15, // تم رفع الإصدار لإضافة فهارس جديدة دون破坏 البيانات الحالية

    // ==========================================
    // 1. إعادة التهيئة الديناميكية (SaaS Routing) 🚀
    // ==========================================
    reInitialize: async function(tenantUrl, tenantKey) {
        if (!tenantUrl || !tenantKey) {
            console.error("❌ بيانات السحابة مفقودة، لا يمكن التهيئة.");
            return false;
        }
        
        try {
            window._supabase = supabase.createClient(tenantUrl, tenantKey);
            console.log("🔄 تم توجيه محرك البيانات بنجاح إلى سحابة المؤسسة.");
            await this.init();
            if (navigator.onLine) {
                await this.pullAllFromCloud();
            }
            return true;
        } catch (e) {
            console.error("❌ فشل تهيئة السحابة:", e);
            return false;
        }
    },

    // ==========================================
    // 2. تهيئة القواعد المحلية (IndexedDB) مع تحسين الفهارس
    // ==========================================
    init: async function() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject("IndexedDB غير مدعوم");
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

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
                    // Module 5: Contracts & Installments
                    'contracts', 'contract_items', 'contract_guarantors', 'installments',
                    // Module 6: Treasury
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
                    // Legacy tables (احتفاظ بها للتوافق)
                    'customers', 'invoices', 'treasury', 'purchases', 'inventory_logs', 'surveys'
                ];

                // إنشاء الجداول ديناميكياً
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

                // إضافة فهارس إضافية لتحسين الأداء في المزامنة والبحث
                // نتحقق من وجود الجدول قبل إضافة الفهارس (لتجنب الأخطاء في حال كان الجدول موجوداً مسبقاً)
                const tablesWithSyncedIndex = ['sync_queue', 'customers', 'invoices', 'contracts', 'installments', 'payments', 'tasks'];
                tablesWithSyncedIndex.forEach(storeName => {
                    if (local.objectStoreNames.contains(storeName)) {
                        const store = request.transaction.objectStore(storeName);
                        if (!store.indexNames.contains('synced')) {
                            store.createIndex('synced', 'synced', { unique: false });
                        }
                        if (!store.indexNames.contains('last_updated')) {
                            store.createIndex('last_updated', 'last_updated', { unique: false });
                        }
                    }
                });

                // فهارس للبحث بالرقم القومي
                ['clients', 'guarantors', 'customers', 'employees'].forEach(storeName => {
                    if (local.objectStoreNames.contains(storeName)) {
                        const store = request.transaction.objectStore(storeName);
                        if (!store.indexNames.contains('national_id')) {
                            store.createIndex('national_id', 'national_id', { unique: true });
                        }
                    }
                });
            };

            request.onsuccess = (event) => {
                this.localDb = event.target.result;
                console.log("✅ المحرك المحلي جاهز للعمل (IndexedDB V15 Active)");
                
                // محاولة مزامنة السجلات المعلقة إن وُجدت السحابة
                this.syncWithCloud().catch(e => console.warn("⚠️ فشل المزامنة التلقائية:", e));
                resolve(true);
            };

            request.onerror = (event) => {
                console.error("❌ فشل فتح قاعدة البيانات:", event.target.error);
                reject("❌ فشل تشغيل المستودع المحلي");
            };
        });
    },

    // ==========================================
    // 3. العمليات الأساسية (CRUD) الهجينة
    // ==========================================
    add: async function(tableName, object) {
        if (!object || typeof object !== 'object') throw new Error("البيانات المراد إضافتها غير صالحة");
        if (!object.id) object.id = crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
        object.last_updated = new Date().toISOString();
        object.synced = false;

        // الحفظ محلياً أولاً
        await this._toLocal(tableName, object);

        // الدفع للسحابة إذا كان متصلاً والمؤسسة مفعلة
        if (navigator.onLine && window._supabase) {
            try {
                const { error } = await window._supabase.from(tableName).upsert([object]);
                if (!error) {
                    object.synced = true;
                    await this._toLocal(tableName, object);
                } else {
                    console.warn(`☁️ خطأ في رفع ${tableName}:`, error.message);
                }
            } catch (e) { 
                console.warn(`☁️ تعذر رفع السجل لجدول ${tableName}، سيتم مزامنته لاحقاً.`); 
            }
        }
        return object;
    },

    update: async function(tableName, id, updates) {
        if (!id) throw new Error("معرف السجل مطلوب للتحديث");
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
                } else {
                    console.warn(`☁️ خطأ في تحديث ${tableName}:`, error.message);
                }
            } catch (e) { 
                console.warn("☁️ تعذر تحديث السحابة، مجدول للمزامنة."); 
            }
        }
        return updatedObject;
    },

    delete: async function(tableName, id) {
        if (!id) throw new Error("معرف السجل مطلوب للحذف");
        return new Promise((resolve, reject) => {
            const transaction = this.localDb.transaction(tableName, "readwrite");
            const store = transaction.objectStore(tableName);
            const request = store.delete(id);
            
            request.onsuccess = async () => {
                if (navigator.onLine && window._supabase) {
                    try {
                        await window._supabase.from(tableName).delete().eq('id', id);
                    } catch (e) { 
                        console.warn("☁️ لم يتم الحذف سحابياً، سيتم تجاهله أو تنظيفه لاحقاً."); 
                    }
                }
                resolve(true);
            };
            request.onerror = (event) => {
                console.error("❌ فشل الحذف المحلي:", event.target.error);
                reject("❌ فشل الحذف المحلي");
            };
        });
    },

    // ==========================================
    // 4. جلب البيانات
    // ==========================================
    getAll: async function(tableName) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.localDb.transaction(tableName, "readonly");
                const store = transaction.objectStore(tableName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = (e) => {
                    console.error(`❌ فشل getAll من ${tableName}:`, e.target.error);
                    reject(e.target.error);
                };
            } catch (e) {
                reject(e);
            }
        });
    },

    getById: async function(tableName, id) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.localDb.transaction(tableName, "readonly");
                const store = transaction.objectStore(tableName);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => {
                    console.error(`❌ فشل getById من ${tableName}:`, e.target.error);
                    reject(e.target.error);
                };
            } catch (e) {
                reject(e);
            }
        });
    },

    getByIndex: async function(tableName, indexName, value) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.localDb.transaction(tableName, "readonly");
                const store = transaction.objectStore(tableName);
                // التحقق من وجود الفهرس، إذا لم يوجد نستخدم البحث الخطي (احتياطي)
                if (store.indexNames.contains(indexName)) {
                    const index = store.index(indexName);
                    const request = index.get(value);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = (e) => reject(e.target.error);
                } else {
                    // fallback: البحث الخطي
                    this.getAll(tableName).then(all => {
                        const found = all.find(record => record[indexName] === value);
                        resolve(found || null);
                    }).catch(reject);
                }
            } catch (e) {
                reject(e);
            }
        });
    },

    // ==========================================
    // 5. محرك المزامنة (Push)
    // ==========================================
    syncWithCloud: async function() {
        if (!navigator.onLine || !window._supabase) {
            console.log("📴 غير متصل أو السحابة غير متاحة، تأجيل المزامنة.");
            return;
        }

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
                        }
                    } catch (e) { 
                        console.warn(`☁️ فشل رفع عنصر في ${table}:`, e.message);
                    }
                }
            } catch (err) {
                console.warn(`⚠️ تعذر الوصول لجدول ${table}:`, err.message);
            }
        }
        console.log("☁️ دورة المزامنة السحابية (Push) اكتملت.");
    },

    // ==========================================
    // 6. محرك استرجاع البيانات (Pull)
    // ==========================================
    pullAllFromCloud: async function() {
        if (!navigator.onLine || !window._supabase) {
            console.warn("⚠️ السحابة غير جاهزة، لا يمكن سحب البيانات الآن.");
            return false;
        }

        const tablesToPull = [
            'branches', 'employees', 'roles', 'users', 'categories', 'suppliers', 'products', 
            'clients', 'guarantors', 'vaults', 'contracts', 'contract_items', 'installments', 
            'payments', 'vault_transactions', 'expenses', 'inventory_transactions', 
            'delivery_orders', 'tasks', 'legal_cases', 'coupons', 'flash_sales', 'system_alerts', 'system_settings'
        ];

        console.log("📥 جاري سحب أحدث البيانات من سحابة المؤسسة (V14.1)...");
        let successCount = 0;
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
                    successCount++;
                }
            } catch (err) {
                console.warn(`❌ فشل سحب بيانات ${table}:`, err.message);
            }
        }
        console.log(`✅ اكتمل سحب البيانات بنجاح (${successCount} جدول).`);
        return true;
    },

    // ==========================================
    // 7. دوال مساعدة
    // ==========================================
    _toLocal: async function(tableName, object) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.localDb.transaction(tableName, "readwrite");
                const store = transaction.objectStore(tableName);
                const request = store.put(object);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => {
                    console.error(`❌ فشل حفظ محلي في ${tableName}:`, e.target.error);
                    reject(e.target.error);
                };
            } catch (e) {
                reject(e);
            }
        });
    }
};

// تجميد الكائن لمنع التعديل العرضي
Object.freeze(db);

window.db = db;