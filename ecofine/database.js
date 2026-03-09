/**
 * 🧠 EcoFine V6 - المحرك المركزي لإكس القابضة (The Master Engine)
 * محرك قاعدة البيانات الائتمانية والمحاسبية الشاملة (الإصدار النهائي)
 * يدير: العملاء، المخزون، المالية، الـ HR، القانونية، والاستعلام
 */

class DBEngine {
    constructor() {
        this.dbName = "X_Holding_ERP_V6";
        this.version = 4; // تم الرفع لـ 4 لفتح الجداول الجديدة (HR, Legal, Survey...)
        this.db = null;
    }

    // ==========================================
    // 1. تشغيل القاعدة وتجهيز كافة المخازن (Stores & Indexes)
    // ==========================================
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // جميع مواسير النظام مقسمة حسب القطاع
                const storeConfigs = [
                    // قطاع الأشخاص
                    { name: 'customers', indexes: ['phone', 'national_id', 'status'] },
                    { name: 'guarantors', indexes: ['customer_id', 'phone'] },
                    { name: 'suppliers', indexes: ['company_name'] },
                    
                    // قطاع المالية والعمليات
                    { name: 'invoices', indexes: ['customer_id', 'date'] },
                    { name: 'purchases', indexes: ['supplier_id', 'date'] },
                    { name: 'installments', indexes: ['invoice_id', 'customer_id', 'status', 'due_date'] },
                    { name: 'treasury_log', indexes: ['type', 'date'] },
                    { name: 'expenses', indexes: ['date'] }, // تمت الإضافة (للخزينة)
                    { name: 'credit_logs', indexes: ['customer_id'] },
                    
                    // قطاع المخازن
                    { name: 'products', indexes: ['category', 'stock'] },
                    { name: 'categories', indexes: ['name'] }, // تمت الإضافة (للتصنيفات)
                    { name: 'inventory_logs', indexes: ['product_id', 'type', 'date'] },
                    
                    // قطاع الموارد البشرية (HR) - تمت الإضافة
                    { name: 'users', indexes: ['username', 'role'] },
                    { name: 'employees', indexes: ['role'] },
                    { name: 'salary_points', indexes: ['emp_id', 'date'] },
                    
                    // قطاع الرقابة والقانونية - تمت الإضافة
                    { name: 'surveys', indexes: ['customer_id', 'status'] },
                    { name: 'legal_cases', indexes: ['customer_id', 'status'] },
                    { name: 'logs', indexes: ['userId', 'action'] }
                ];

                storeConfigs.forEach(cfg => {
                    if (!db.objectStoreNames.contains(cfg.name)) {
                        const store = db.createObjectStore(cfg.name, { keyPath: 'id' });
                        // إنشاء الفهارس لتسريع البحث بشكل خيالي
                        if (cfg.indexes) {
                            cfg.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
                        }
                        console.log(`✅ تم بناء ماسورة: ${cfg.name}`);
                    }
                });
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("🚀 محرك V6 المركزي يعمل بكامل طاقته.. الإمبراطورية جاهزة");
                resolve();
            };

            request.onerror = (e) => reject("❌ فشل في الوصول للنظام");
        });
    }

    // ==========================================
    // ⚙️ محرك الإدخال الذكي (X-Insert)
    // ==========================================
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const prefix = storeName.substring(0, 3).toUpperCase();
            const id = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            
            const record = { 
                ...data, 
                id, 
                created_at: new Date().toISOString(),
                // منطق الائتمان المبدئي (50% للعميل والضامن الجديد)
                credit_score: ['customers', 'guarantors'].includes(storeName) && !data.credit_score ? 50 : (data.credit_score || 0)
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject(`Error adding to ${storeName}`);
        });
    }

    // ==========================================
    // 📈 محرك الحسابات الجارية (Financial Journey)
    // ==========================================
    async getCustomerJourney(customerId) {
        // حساب رحلة العميل المالية الشاملة في جزء من الثانية
        const invoices = await this.getAll('invoices');
        const installments = await this.getAll('installments');
        
        const customerInvoices = invoices.filter(i => i.customer_id === customerId);
        const customerInst = installments.filter(i => i.customer_id === customerId);

        const totalDebt = customerInvoices.reduce((s, i) => s + Number(i.total), 0);
        const totalPaid = customerInst.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
        
        const delayedDays = customerInst
            .filter(i => i.status === 'pending' && new Date(i.due_date) < new Date())
            .reduce((s, i) => s + Math.floor((new Date() - new Date(i.due_date)) / (1000 * 60 * 60 * 24)), 0);

        return {
            total_debt: totalDebt,
            total_paid: totalPaid,
            remaining: totalDebt - totalPaid,
            delay_days: delayedDays,
            trust_level: delayedDays > 0 ? "خطر ⚠️" : "ملتزم ✅"
        };
    }

    // ==========================================
    // 🛠️ دوال العمليات العامة (CRUD)
    // ==========================================
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(`Error reading ${storeName}`);
        });
    }

    // البحث المتقدم باستخدام الفهارس (Indexes)
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const index = tx.objectStore(storeName).index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(`Error searching in ${storeName}`);
        });
    }

    async update(storeName, id, newData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                if (!getReq.result) return reject("السجل غير موجود");
                const updated = { ...getReq.result, ...newData, updated_at: new Date().toISOString() };
                store.put(updated);
                resolve(updated);
            };
            getReq.onerror = () => reject("خطأ في التحديث");
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject("خطأ في الحذف");
        });
    }
}

// تصدير المحرك كنسخة واحدة (Singleton) لكل النظام
const db = new DBEngine();
