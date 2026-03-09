/**
 * 🛠️ EcoFine Pro V4 - المحرك (The Engine)
 * إدارة قاعدة البيانات المحلية IndexedDB لجميع الموديولات
 * التحديث: شمولية الجداول + نظام المعرفات الذكي
 */

class DBEngine {
    constructor() {
        this.dbName = "EcoFine_V4";
        this.version = 2; // تم رفع الإصدار لتفعيل التحديثات الجديدة
        this.db = null;
    }

    // 1. تشغيل القاعدة وتجهيز كافة المخازن (Stores)
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // قائمة بجميع المواسير المطلوبة للنظام بالكامل (30 موديول)
                const stores = [
                    'customers',      // موديول 5: العملاء والضامنين
                    'products',       // موديول 9: المخازن والأصناف
                    'invoices',       // موديول 12: العقود والفواتير
                    'installments',   // موديول 15: الأقساط والجدولة
                    'expenses',       // موديول 20: المصاريف الإدارية
                    'treasury',       // موديول 21: الخزينة والسيولة
                    'employees',      // موديول 22: شؤون الموظفين
                    'attendance',     // موديول 23: الحضور والانصراف
                    'salary_points',  // موديول 24: نظام النقاط والرواتب
                    'legal_cases',    // موديول 25: الشؤون القانونية
                    'surveys',        // موديول 26: الاستعلام الميداني
                    'logs',           // موديول 27: سجل النظام والأمان
                    'suppliers',      // موديول 28: الموردين
                    'settings'        // موديول 29: إعدادات النظام
                ];

                // إنشاء كل مخزن لو مش موجود
                stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: 'id' });
                        console.log(`📡 تم إنشاء ماسورة: ${storeName}`);
                    }
                });
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("✅ محرك إكس القابضة V4 جاهز للعمل بكامل طاقته");
                resolve();
            };

            request.onerror = (e) => reject("❌ فشل في تشغيل القاعدة");
        });
    }

    // 2. دالة الإضافة العامة (Create)
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // توليد ID فريد (اسم الموديول + الوقت + رقم عشوائي لضمان عدم التكرار)
            const randomID = Math.floor(Math.random() * 1000);
            const id = `${storeName.substring(0, 3).toUpperCase()}-${Date.now()}-${randomID}`;
            
            const record = { 
                ...data, 
                id, 
                created_at: new Date().toISOString(),
                // تطبيق قاعدة الـ 50% تقييم ائتماني للعملاء الجدد آلياً
                credit_score: (storeName === 'customers' && !data.credit_score) ? 50 : (data.credit_score || 0)
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject("Error adding record");
        });
    }

    // 3. دالة جلب كل البيانات (Read All)
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Error fetching records");
        });
    }

    // 4. دالة التحديث (Update)
    async update(storeName, id, newData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                if (!request.result) return reject("Record not found");
                const data = { 
                    ...request.result, 
                    ...newData, 
                    updated_at: new Date().toISOString() 
                };
                store.put(data);
                resolve(data);
            };
        });
    }

    // 5. دالة الحذف (Delete) - مهمة للمرتجعات والأخطاء
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject("Error deleting record");
        });
    }

    // 6. البحث برقم محدد (Get By ID)
    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Error finding record");
        });
    }
}

// تصدير المحرك كنسخة واحدة (Singleton)
const db = new DBEngine();
