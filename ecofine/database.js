/**
 * 🗄️ database.js - المحرك الهجين (Offline-First / Cloud Sync)
 * النظام: Eco Fine Pro V10.1 Turbo | تطوير: M H 4 Tech
 * التحديث: دمج جداول الجرد والتصنيفات، ورفع الإصدار لإجبار المتصفح على التحديث.
 * التقنيات: IndexedDB (محلي) + Supabase (سحابي).
 */

const SUPABASE_URL = "https://pyrcpouvcvjkgpjyuafz.supabase.co";
// 👈 يسحب المفتاح من XConfig أو يستخدم الافتراضي
const SUPABASE_KEY = typeof window.XConfig !== 'undefined' && window.XConfig.cloud ? window.XConfig.cloud.key : "YOUR_ANON_PUBLIC_KEY"; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const db = {
    localDb: null,
    dbName: "EcoFine_Local_DB",

    // ==========================================
    // 1. تهيئة القواعد (محلي + سحابي)
    // ==========================================
    init: async function() {
        return new Promise((resolve, reject) => {
            // 🚀 تم رفع الإصدار لـ 11 لإجبار المتصفح على إنشاء الجداول الجديدة فوراً
            const request = indexedDB.open(this.dbName, 11);

            request.onupgradeneeded = (event) => {
                const local = event.target.result;
                
                // الجداول الأساسية
                if (!local.objectStoreNames.contains('customers')) local.createObjectStore('customers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('products')) local.createObjectStore('products', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('invoices')) local.createObjectStore('invoices', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('installments')) local.createObjectStore('installments', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('treasury')) local.createObjectStore('treasury', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('sync_queue')) local.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });

                // جداول Eco Fine Pro V6 الإضافية (HR، قانونية، مصروفات، موردين)
                if (!local.objectStoreNames.contains('guarantors')) local.createObjectStore('guarantors', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('suppliers')) local.createObjectStore('suppliers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('purchases')) local.createObjectStore('purchases', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('expenses')) local.createObjectStore('expenses', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('users')) local.createObjectStore('users', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('surveys')) local.createObjectStore('surveys', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('legal_cases')) local.createObjectStore('legal_cases', { keyPath: 'id' });
                
                // 📦 الجداول الجديدة الخاصة بموديول المخازن والجرد
                if (!local.objectStoreNames.contains('categories')) local.createObjectStore('categories', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('inventory_logs')) local.createObjectStore('inventory_logs', { keyPath: 'id' });
            };

            request.onsuccess = (event) => {
                this.localDb = event.target.result;
                console.log("✅ المحرك المحلي جاهز (Eco Fine Pro V10.1 Turbo)");
                // بدء محاولة المزامنة فور التشغيل
                this.syncWithCloud();
                resolve(true);
            };

            request.onerror = () => reject("❌ فشل تشغيل المستودع المحلي");
        });
    },

    // ==========================================
    // 2. العمليات الأساسية (إضافة / تعديل / حذف)
    // ==========================================
    add: async function(tableName, object) {
        // توليد ID لو مش موجود (UUID لضمان عدم التكرار سحابياً)
        if (!object.id) object.id = crypto.randomUUID();
        object.last_updated = new Date().toISOString();
        object.synced = false;

        // أ) الحفظ محلياً فوراً (الأولوية للسرعة)
        await this._toLocal(tableName, object);

        // ب) محاولة الرفع للسحابة لو فيه إنترنت
        if (navigator.onLine) {
            try {
                const { error } = await _supabase.from(tableName).upsert([object]);
                if (!error) {
                    object.synced = true;
                    await this._toLocal(tableName, object); // تحديث حالة المزامنة محلياً
                }
            } catch (e) { console.log("☁️ السحابة غير متاحة حالياً، تم الجدولة"); }
        }
        
        return object;
    },

    update: async function(tableName, id, updates) {
        const existing = await this.getById(tableName, id);
        if (!existing) throw new Error("السجل غير موجود محلياً");

        const updatedObject = { ...existing, ...updates, last_updated: new Date().toISOString(), synced: false };
        
        await this._toLocal(tableName, updatedObject);
        
        if (navigator.onLine) {
            try {
                const { error } = await _supabase.from(tableName).upsert([updatedObject]);
                if (!error) {
                    updatedObject.synced = true;
                    await this._toLocal(tableName, updatedObject);
                }
            } catch (e) { console.log("☁️ السحابة غير متاحة للتحديث، تم الجدولة"); }
        }
        return updatedObject;
    },

    // إضافة دالة الحذف لاستكمال العمليات (CRUD)
    delete: async function(tableName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDb.transaction(tableName, "readwrite");
            const store = transaction.objectStore(tableName);
            const request = store.delete(id);
            
            request.onsuccess = async () => {
                // محاولة الحذف من السحابة إذا كان متصلاً
                if (navigator.onLine) {
                    try {
                        await _supabase.from(tableName).delete().eq('id', id);
                    } catch (e) { console.log("☁️ لم يتم الحذف سحابياً بسبب انقطاع الاتصال"); }
                }
                resolve(true);
            };
            request.onerror = () => reject("❌ فشل الحذف المحلي");
        });
    },

    // ==========================================
    // 3. جلب البيانات (دائماً من المحلي للسرعة)
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

    getByIndex: async function(tableName, column, value) {
        const all = await this.getAll(tableName);
        return all.find(item => item[column] === value);
    },

    // ==========================================
    // 4. محرك المزامنة التلقائي (Background Sync)
    // ==========================================
    syncWithCloud: async function() {
        if (!navigator.onLine) return;

        // 🚀 تم إضافة جداول المخازن (categories, inventory_logs) لقائمة المزامنة
        const tables = [
            'customers', 'products', 'invoices', 'installments', 'treasury',
            'guarantors', 'suppliers', 'purchases', 'expenses', 'users', 'surveys', 'legal_cases',
            'categories', 'inventory_logs'
        ];
        
        for (const table of tables) {
            try {
                // التحقق من وجود الجدول محلياً قبل محاولة مزامنته لمنع الأخطاء
                if (!this.localDb.objectStoreNames.contains(table)) continue;
                
                const allLocal = await this.getAll(table);
                const unSynced = allLocal.filter(item => !item.synced);

                for (const item of unSynced) {
                    try {
                        const { error } = await _supabase.from(table).upsert([item]);
                        if (!error) {
                            item.synced = true;
                            await this._toLocal(table, item);
                        }
                    } catch (e) { break; } // توقف لو الشبكة سقطت
                }
            } catch (err) {
                console.warn(`تخطي مزامنة جدول ${table} لعدم جاهزيته.`);
            }
        }
        console.log("🔄 تمت المزامنة مع سحابة إكس");
    },

    // وظيفة داخلية للكتابة في IndexedDB
    _toLocal: async function(tableName, object) {
        return new Promise((resolve) => {
            const transaction = this.localDb.transaction(tableName, "readwrite");
            const store = transaction.objectStore(tableName);
            store.put(object);
            transaction.oncomplete = () => resolve(true);
        });
    },

    // حساب رحلة العميل (محلياً)
    getCustomerJourney: async function(customerId) {
        const [invoices, installments] = await Promise.all([
            this.getAll('invoices'),
            this.getAll('installments')
        ]);
        const cInvoices = invoices.filter(i => i.customer_id === customerId);
        const cInst = installments.filter(i => i.customer_id === customerId);
        const totalDebt = cInvoices.reduce((s, i) => s + Number(i.total), 0);
        const totalPaid = cInst.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
        return { total_debt: totalDebt, total_paid: totalPaid, remaining: totalDebt - totalPaid };
    }
};

window.db = db;
