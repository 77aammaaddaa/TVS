// database.js - محرك قاعدة بيانات إكس القابضة (V4)
// هذا المحرك يدير البيانات محلياً ويجهزها للمزامنة السحابية

class DBEngine {
    constructor() {
        this.dbName = "EcoFine_V4";
        this.version = 1;
        this.db = null;
    }

    // 1. تشغيل القاعدة وتجهيز المخازن (Stores)
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // موديول 5: العملاء والضامنين
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id' });
                }
                // موديول 9: المخازن
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' });
                }
                // موديول 12: الفواتير (العقود)
                if (!db.objectStoreNames.contains('invoices')) {
                    db.createObjectStore('invoices', { keyPath: 'id' });
                }
                // موديول 15: الأقساط والتحصيل
                if (!db.objectStoreNames.contains('installments')) {
                    db.createObjectStore('installments', { keyPath: 'id' });
                }
                // موديول 24: الشؤون القانونية
                if (!db.objectStoreNames.contains('legal_cases')) {
                    db.createObjectStore('legal_cases', { keyPath: 'id' });
                }
                // موديول 3: الصلاحيات والمستخدمين
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("✅ محرك قاعدة البيانات جاهز للتشغيل");
                resolve();
            };

            request.onerror = (e) => reject("❌ فشل في تشغيل القاعدة");
        });
    }

    // 2. دالة الإدخال العامة (تستخدمها كل الموديولات)
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // توليد معرف فريد يعتمد على اسم الموديول والوقت
            const id = `${storeName.substring(0, 3).toUpperCase()}-${Date.now()}`;
            const record = { 
                ...data, 
                id, 
                created_at: new Date().toISOString(),
                // قاعدة الـ 50% للعملاء الجدد
                credit_score: storeName === 'customers' ? 50 : (data.credit_score || 0)
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject("Error adding record");
        });
    }

    // 3. دالة جلب البيانات (للعرض في الجداول)
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }
    
    // 4. دالة التحديث (مهمة للتحصيل وتقييم الائتمان)
    async update(storeName, id, newData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                const data = { ...request.result, ...newData, updated_at: new Date().toISOString() };
                store.put(data);
                resolve(data);
            };
        });
    }
}

// تصدير المحرك كنسخة واحدة لكل النظام
const db = new DBEngine();
