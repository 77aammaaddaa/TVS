/**
 * 🧠 EcoFine V5 - المحرك المركزي لإكس القابضة
 * محرك قاعدة البيانات الائتمانية والمحاسبية الشاملة
 * يدير: العملاء، الضامنين، الموردين، المخزون، والرحلة المالية
 */

class DBEngine {
    constructor() {
        this.dbName = "X_Holding_ERP_V5";
        this.version = 3; // رفع الإصدار لتحديث الهيكل الشامل
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // 1. قاعدة بيانات الأشخاص (مركزية الائتمان)
                const peopleStores = [
                    'customers',  // العميل: (الاسم، البطاقة، التقييم الائتماني، المديونية)
                    'guarantors', // الضامنين: (صلة القرابة، تقييم الضمان، تاريخه)
                    'suppliers'   // الموردين: (بيانات الشركة، الحساب الجاري)
                ];

                // 2. قاعدة بيانات العمليات (الرحلة المالية)
                const transactionStores = [
                    'invoices',     // مبيعات: (رقم العقد، العميل، الضامن، الإجمالي)
                    'purchases',    // مشتريات: (المورد، الأصناف، التكلفة)
                    'installments', // الأقساط: (تاريخ، مبلغ، حالة، غرامة تأخير)
                    'credit_logs',  // محرك التقييم: (تغير سكور العميل بناءً على التزامه)
                    'treasury_log'  // حركة الخزينة: (كل مليم دخل أو خرج)
                ];

                // 3. قاعدة بيانات المخزون والأمان
                const inventoryStores = [
                    'products',       // الأصناف: (سعر الشراء، الجملة، الكاش، القسط)
                    'inventory_logs', // حركة الصنف: (وارد، منصرف، تالف، جرد)
                    'users',          // الموظفين: (صلاحيات، نقاط الأداء)
                    'logs'            // سجل النظام: (مين عمل إيه وإمتى)
                ];

                // تنفيذ إنشاء الجداول (Stores)
                [...peopleStores, ...transactionStores, ...inventoryStores].forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id' });
                    }
                });
            };

            request.onsuccess = (e) => {
                this.db = e.target.result;
                console.log("🚀 محرك V5 المركزي يعمل الآن.. جاهز لإدارة الإمبراطورية");
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
            const id = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100)}`;
            
            const record = { 
                ...data, 
                id, 
                created_at: new Date().toISOString(),
                // منطق الائتمان المبدئي (50% للعميل والضامن الجديد)
                credit_score: ['customers', 'guarantors'].includes(storeName) ? (data.credit_score || 50) : undefined
            };

            const request = store.add(record);
            request.onsuccess = () => resolve(record);
            request.onerror = () => reject("Error in X-Insert");
        });
    }

    // ==========================================
    // 📈 محرك الحسابات الجارية (Financial Journey)
    // ==========================================
    async getCustomerJourney(customerId) {
        // هذه الدالة تجمع "رحلة العميل" من 3 جداول مختلفة في لحظة واحدة
        const invoices = await this.getAll('invoices');
        const installments = await this.getAll('installments');
        
        const customerInvoices = invoices.filter(i => i.customer_id === customerId);
        const customerInst = installments.filter(i => i.customer_id === customerId);

        const totalDebt = customerInvoices.reduce((s, i) => s + i.total, 0);
        const totalPaid = customerInst.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
        
        // حساب مدة التأخير (بالأيام)
        const delayedDays = customerInst
            .filter(i => i.status === 'pending' && new Date(i.due_date) < new Date())
            .reduce((s, i) => s + Math.floor((new Date() - new Date(i.due_date)) / (1000*60*60*24)), 0);

        return {
            total_debt: totalDebt,
            total_paid: totalPaid,
            remaining: totalDebt - totalPaid,
            delay_days: delayedDays,
            trust_level: delayedDays > 0 ? "خطر ⚠️" : "ملتزم ✅"
        };
    }

    // ==========================================
    // 🛠️ دوال العمليات العامة
    // ==========================================
    async getAll(storeName) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async update(storeName, id, newData) {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const oldData = await new Promise(r => {
            const req = store.get(id);
            req.onsuccess = () => r(req.result);
        });
        
        const updated = { ...oldData, ...newData, updated_at: new Date().toISOString() };
        return new Promise(r => {
            const req = store.put(updated);
            req.onsuccess = () => r(updated);
        });
    }

    async delete(storeName, id) {
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        return true;
    }
}

const db = new DBEngine();
