/**
 * 🚀 EcoFine V6 Hybrid - المحرك المركزي لإكس القابضة (The Master Engine)
 * الإصدار التيربو: مزامنة سحابية (Supabase) + تخزين محلي (IndexedDB)
 * يدير: العملاء، المخزون، المالية، الـ HR، القانونية، والاستعلام
 */

class DBEngine {
    constructor() {
        this.dbName = "X_Holding_ERP_V6_Hybrid";
        this.version = 5; 
        this.localDb = null;
        // تكوين Supabase - سيتم جلب المفاتيح من XConfig
        this.client = null;
    }

    // ==========================================
    // 1. تشغيل القاعدة وتجهيز المحركات (Init)
    // ==========================================
    async init() {
        // تهيئة عميل Supabase
        const { url, key } = window.XConfig.cloud;
        this.client = supabase.createClient(url, key);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const storeConfigs = [
                    { name: 'customers', indexes: ['phone', 'national_id', 'status'] },
                    { name: 'guarantors', indexes: ['customer_id', 'phone'] },
                    { name: 'suppliers', indexes: ['company_name'] },
                    { name: 'invoices', indexes: ['customer_id', 'date'] },
                    { name: 'purchases', indexes: ['supplier_id', 'date'] },
                    { name: 'installments', indexes: ['invoice_id', 'customer_id', 'status', 'due_date'] },
                    { name: 'treasury_log', indexes: ['type', 'date'] },
                    { name: 'expenses', indexes: ['date'] },
                    { name: 'products', indexes: ['category', 'stock'] },
                    { name: 'users', indexes: ['username', 'role'] },
                    { name: 'employees', indexes: ['role'] },
                    { name: 'surveys', indexes: ['customer_id', 'status'] },
                    { name: 'legal_cases', indexes: ['customer_id', 'status'] }
                ];

                storeConfigs.forEach(cfg => {
                    if (!db.objectStoreNames.contains(cfg.name)) {
                        const store = db.createObjectStore(cfg.name, { keyPath: 'id' });
                        if (cfg.indexes) {
                            cfg.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
                        }
                    }
                });
            };

            request.onsuccess = (e) => {
                this.localDb = e.target.result;
                console.log("🚀 المحرك الهجين V9 يعمل.. الاتصال بالسحابة مؤمن");
                // محاولة مزامنة البيانات غير المرفوعة فور التشغيل
                this.syncUnsyncedData();
                resolve();
            };

            request.onerror = () => reject("❌ فشل في الوصول للنظام");
        });
    }

    // ==========================================
    // ⚙️ محرك الإدخال الهجين (Hybrid Insert)
    // ==========================================
    async add(storeName, data) {
        // توليد معرف UUID فريد عالمياً للمزامنة
        const id = crypto.randomUUID();
        const record = { 
            ...data, 
            id, 
            created_at: new Date().toISOString(),
            synced: false, // علامة المزامنة
            // تطبيق قاعدة الـ 50% للمستجدين
            credit_score: ['customers', 'guarantors'].includes(storeName) && !data.credit_score ? 50 : (data.credit_score || 0)
        };

        // 1. الحفظ المحلي فوراً (السرعة القصوى)
        await this._saveLocal(storeName, record);

        // 2. محاولة الرفع للسحابة (لو أوفلاين هيفضل synced: false)
        if (navigator.onLine) {
            try {
                const { error } = await this.client.from(storeName).upsert([record]);
                if (!error) {
                    record.synced = true;
                    await this._saveLocal(storeName, record); // تحديث الحالة محلياً
                }
            } catch (err) { console.warn("☁️ السحابة غير متاحة، الحفظ محلي فقط."); }
        }

        return record;
    }

    // ==========================================
    // 📈 محرك الحسابات الجارية (Financial Analytics)
    // ==========================================
    async getCustomerJourney(customerId) {
        const invoices = await this.getAll('invoices');
        const installments = await this.getAll('installments');
        
        const customerInvoices = invoices.filter(i => i.customer_id === customerId);
        const customerInst = installments.filter(i => i.customer_id === customerId);

        const totalDebt = customerInvoices.reduce((s, i) => s + Number(i.total), 0);
        const totalPaid = customerInst.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
        
        // حساب أيام التأخير الفعلية
        const delayedDays = customerInst
            .filter(i => i.status === 'pending' && new Date(i.due_date) < new Date())
            .reduce((s, i) => {
                const diff = Math.floor((new Date() - new Date(i.due_date)) / (1000 * 60 * 60 * 24));
                return s + (diff > 0 ? diff : 0);
            }, 0);

        return {
            total_debt: totalDebt,
            total_paid: totalPaid,
            remaining: totalDebt - totalPaid,
            delay_days: delayedDays,
            trust_level: delayedDays > 0 ? "خطر ⚠️" : "ملتزم ✅"
        };
    }

    // ==========================================
    // 🔄 محرك المزامنة التلقائي (Auto-Sync)
    // ==========================================
    async syncUnsyncedData() {
        if (!navigator.onLine) return;

        const stores = ['customers', 'invoices', 'installments', 'products', 'treasury_log'];
        for (const storeName of stores) {
            const allLocal = await this.getAll(storeName);
            const unsynced = allLocal.filter(item => !item.synced);

            for (const record of unsynced) {
                try {
                    const { error } = await this.client.from(storeName).upsert([record]);
                    if (!error) {
                        record.synced = true;
                        await this._saveLocal(storeName, record);
                    }
                } catch (e) { break; } // توقف لو الشبكة سقطت أثناء المزامنة
            }
        }
        console.log("🔄 تم تحديث السحابة بالبيانات المحلية");
    }

    // ==========================================
    // 🛠️ دوال العمليات العامة (CRUD)
    // ==========================================
    async getAll(storeName) {
        return new Promise((resolve) => {
            const tx = this.localDb.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getById(storeName, id) {
        return new Promise((resolve) => {
            const tx = this.localDb.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(id);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async update(storeName, id, newData) {
        const existing = await this.getById(storeName, id);
        const updated = { ...existing, ...newData, updated_at: new Date().toISOString(), synced: false };
        
        await this._saveLocal(storeName, updated);
        
        if (navigator.onLine) {
            const { error } = await this.client.from(storeName).upsert([updated]);
            if (!error) {
                updated.synced = true;
                await this._saveLocal(storeName, updated);
            }
        }
        return updated;
    }

    // وظيفة داخلية للحفظ المحلي
    async _saveLocal(storeName, record) {
        return new Promise((resolve) => {
            const tx = this.localDb.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(record);
            tx.oncomplete = () => resolve();
        });
    }
}

const db = new DBEngine();
