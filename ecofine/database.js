/**
 * 🗄️ database.js - المحرك الهجين (Offline-First / Cloud Sync)
 * النظام: Eco Fine Pro V10.2 Platinum | تطوير: M H 4 Tech
 * التحديث: دمج دالة السحب للأجهزة الجديدة (Pull)، معالجة أخطاء المزامنة، وضبط التصنيفات.
 */

// ⚠️ تنبيه: تأكد من إضافة مفتاح الـ API الحقيقي في إعدادات النظام أو هنا مباشرة
const SUPABASE_URL = "https://pyrcpouvcvjkgpjyuafz.supabase.co";
const SUPABASE_KEY = (typeof window.XConfig !== 'undefined' && window.XConfig.cloud && window.XConfig.cloud.key) 
                     ? window.XConfig.cloud.key 
                     : "YOUR_ANON_PUBLIC_KEY"; // استبدل هذا بالمفتاح الحقيقي إذا أردت تثبيته في الكود

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const db = {
    localDb: null,
    dbName: "EcoFine_Local_DB",

    // ==========================================
    // 1. تهيئة القواعد (محلي + سحابي)
    // ==========================================
    init: async function() {
        return new Promise((resolve, reject) => {
            // 🚀 تم رفع الإصدار لـ 12 لإجبار الموبايل على التحديث وبناء الجداول الناقصة
            const request = indexedDB.open(this.dbName, 12);

            request.onupgradeneeded = (event) => {
                const local = event.target.result;
                
                // الجداول الأساسية
                if (!local.objectStoreNames.contains('customers')) local.createObjectStore('customers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('products')) local.createObjectStore('products', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('invoices')) local.createObjectStore('invoices', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('installments')) local.createObjectStore('installments', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('treasury')) local.createObjectStore('treasury', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('sync_queue')) local.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });

                // جداول Eco Fine Pro V6
                if (!local.objectStoreNames.contains('guarantors')) local.createObjectStore('guarantors', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('suppliers')) local.createObjectStore('suppliers', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('purchases')) local.createObjectStore('purchases', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('expenses')) local.createObjectStore('expenses', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('users')) local.createObjectStore('users', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('surveys')) local.createObjectStore('surveys', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('legal_cases')) local.createObjectStore('legal_cases', { keyPath: 'id' });
                
                // 📦 الجداول الجديدة الخاصة بالمخازن والجرد
                if (!local.objectStoreNames.contains('categories')) local.createObjectStore('categories', { keyPath: 'id' });
                if (!local.objectStoreNames.contains('inventory_logs')) local.createObjectStore('inventory_logs', { keyPath: 'id' });
            };

            request.onsuccess = (event) => {
                this.localDb = event.target.result;
                console.log("✅ المحرك المحلي جاهز (Eco Fine Pro V10.2 Platinum)");
                
                // محاولة مزامنة السجلات المعلقة
                this.syncWithCloud();
                resolve(true);
            };

            request.onerror = () => reject("❌ فشل تشغيل المستودع المحلي");
        });
    },

    // ==========================================
    // 2. العمليات الأساسية (CRUD)
    // ==========================================
    add: async function(tableName, object) {
        if (!object.id) object.id = crypto.randomUUID();
        object.last_updated = new Date().toISOString();
        object.synced = false;

        await this._toLocal(tableName, object);

        if (navigator.onLine && SUPABASE_KEY !== "YOUR_ANON_PUBLIC_KEY") {
            try {
                const { error } = await _supabase.from(tableName).upsert([object]);
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
        
        if (navigator.onLine && SUPABASE_KEY !== "YOUR_ANON_PUBLIC_KEY") {
            try {
                const { error } = await _supabase.from(tableName).upsert([updatedObject]);
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
                if (navigator.onLine && SUPABASE_KEY !== "YOUR_ANON_PUBLIC_KEY") {
                    try {
                        await _supabase.from(tableName).delete().eq('id', id);
                    } catch (e) { console.warn("☁️ لم يتم الحذف سحابياً."); }
                }
                resolve(true);
            };
            request.onerror = () => reject("❌ فشل الحذف المحلي");
        });
    },

    // ==========================================
    // 3. جلب البيانات (محلياً)
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

    // ==========================================
    // 4. محرك المزامنة (Push)
    // ==========================================
    syncWithCloud: async function() {
        if (!navigator.onLine || SUPABASE_KEY === "YOUR_ANON_PUBLIC_KEY") return;

        const tables = [
            'customers', 'products', 'invoices', 'installments', 'treasury',
            'guarantors', 'suppliers', 'purchases', 'expenses', 'users', 'surveys', 'legal_cases',
            'categories', 'inventory_logs'
        ];
        
        for (const table of tables) {
            try {
                if (!this.localDb.objectStoreNames.contains(table)) continue;
                
                const allLocal = await this.getAll(table);
                const unSynced = allLocal.filter(item => !item.synced);

                for (const item of unSynced) {
                    try {
                        const { error } = await _supabase.from(table).upsert([item]);
                        if (!error) {
                            item.synced = true;
                            await this._toLocal(table, item);
                        } else {
                            console.error(`❌ خطأ مزامنة في ${table}:`, error.message);
                            continue; // 🚀 تخطي السجل التالف واستكمال الباقي (Anti-Break)
                        }
                    } catch (e) { 
                        // توقف عن محاولة مزامنة هذا الجدول إذا انقطعت الشبكة تماماً
                        break; 
                    }
                }
            } catch (err) {
                console.warn(`⚠️ تعذر الوصول لجدول ${table}:`, err.message);
            }
        }
        console.log("☁️ دورة المزامنة السحابية اكتملت.");
    },

    // ==========================================
    // 5. محرك استرجاع البيانات للأجهزة الجديدة (Pull) 🚀
    // ==========================================
    pullAllFromCloud: async function() {
        if (!navigator.onLine || SUPABASE_KEY === "YOUR_ANON_PUBLIC_KEY") {
            alert("⚠️ السحابة غير جاهزة، تأكد من الاتصال وإعدادات Supabase.");
            return false;
        }

        const tables = [
            'categories', 'products', 'customers', 'invoices', 'installments', 'treasury',
            'inventory_logs'
        ];

        console.log("📥 جاري سحب البيانات من السحابة...");
        for (const table of tables) {
            try {
                if (!this.localDb.objectStoreNames.contains(table)) continue;
                
                const { data, error } = await _supabase.from(table).select('*');
                if (error) throw error;
                
                if (data && data.length > 0) {
                    for (const item of data) {
                        item.synced = true; // تم سحبها من السحابة بنجاح
                        await this._toLocal(table, item);
                    }
                }
            } catch (err) {
                console.warn(`❌ فشل سحب بيانات ${table}:`, err.message);
            }
        }
        console.log("✅ تم سحب وتخزين جميع البيانات بنجاح!");
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
    },

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
