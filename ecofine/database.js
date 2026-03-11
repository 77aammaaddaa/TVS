/**
 * 🗄️ database.js - المحرك الهجين (Enterprise SaaS Edition V12.0)
 * النظام: Eco Fine Pro | المطور: Techno Vision Solutions (Mr. X)
 * التحديث: دمج جداول المراقبة، التنبيهات، والتسويق، وترقية إصدار القاعدة إلى 13.
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
            // ⚠️ تم رفع الإصدار إلى 13 لإجبار المتصفح على إنشاء الجداول الجديدة
            const request = indexedDB.open(this.dbName, 13);

            request.onupgradeneeded = (event) => {
                const local = event.target.result;
                
                // الجداول الأساسية
                if (!local.objectStoreNames.contains('customers')) local.createObjectStore('customers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('products')) local.createObjectStore('products', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('invoices')) local.createObjectStore('invoices', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('installments')) local.createObjectStore('installments', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('treasury')) local.createObjectStore('treasury', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('sync_queue')) local.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });

                // جداول Eco Fine Pro التشغيلية
                if (!local.objectStoreNames.contains('guarantors')) local.createObjectStore('guarantors', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('suppliers')) local.createObjectStore('suppliers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('purchases')) local.createObjectStore('purchases', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('expenses')) local.createObjectStore('expenses', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('users')) local.createObjectStore('users', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('surveys')) local.createObjectStore('surveys', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('legal_cases')) local.createObjectStore('legal_cases', { keyPath: 'id' });
                
                // 📦 الجداول الخاصة بالمخازن والجرد
                if (!local.objectStoreNames.contains('categories')) local.createObjectStore('categories', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('inventory_logs')) local.createObjectStore('inventory_logs', { keyPath: 'id' });

                // 🚀 الجداول السيادية الجديدة (V12.0)
                if (!local.objectStoreNames.contains('audit_logs')) local.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
                if (!local.objectStoreNames.contains('system_alerts')) local.createObjectStore('system_alerts', { keyPath: 'id', autoIncrement: true });
                if (!local.objectStoreNames.contains('coupons')) local.createObjectStore('coupons', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('flash_sales')) local.createObjectStore('flash_sales', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('system_settings')) local.createObjectStore('system_settings', { keyPath: 'id' });
            };

            request.onsuccess = (event) => {
                this.localDb = event.target.result;
                console.log("✅ المحرك المحلي جاهز للعمل (IndexedDB V13 Active)");
                
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

        // تم إضافة جداول V12.0 للمزامنة
        const tables = [
            'customers', 'products', 'invoices', 'installments', 'treasury',
            'guarantors', 'suppliers', 'purchases', 'expenses', 'users', 'surveys', 'legal_cases',
            'categories', 'inventory_logs', 'coupons', 'flash_sales', 'system_alerts', 'audit_logs'
        ];
        
        for (const table of tables) {
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

        // تم إضافة جداول V12.0 للسحب من السحابة
        const tables = [
            'users', 'categories', 'products', 'customers', 'invoices', 'installments', 'treasury',
            'inventory_logs', 'coupons', 'flash_sales', 'system_alerts'
        ];

        console.log("📥 جاري سحب أحدث البيانات من سحابة المؤسسة...");
        for (const table of tables) {
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
