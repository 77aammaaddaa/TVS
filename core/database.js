// ==========================================
// ملف database.js - المحرك المالي والمزامنة الهجينة (Hybrid Engine)
// ==========================================

// 1. تهيئة قاعدة البيانات المحلية باستخدام Dexie.js
const db = new Dexie("EcoFineXLiteDB");

// تعريف الجداول المحلية (Schema)
db.version(1).stores({
    local_inventory: 'id, product_name, price, stock', // جدول المخزون
    local_sales: 'invoice_id, timestamp',              // جدول الفواتير
    sync_queue: '++id, operation_type'                 // طابور المزامنة (++ تعني Auto-increment)
});

// 2. دالة حفظ الفاتورة (تعمل أوفلاين بسرعة 0.1 ثانية)
// تُستدعى هذه الدالة من ملف app.js عند الضغط على "دفع الفاتورة"
async function saveInvoiceToDB(invoiceData) {
    // نستخدم (Transaction) لضمان: إما أن تكتمل كل العمليات بنجاح، أو يتم التراجع عنها بالكامل لو حدث خطأ
    return db.transaction('rw', db.local_sales, db.local_inventory, db.sync_queue, async () => {
        
        // أ. حفظ الفاتورة في الجدول المحلي
        await db.local_sales.add(invoiceData);

        // ب. خصم الكميات من المخزون المحلي
        for (const item of invoiceData.items) {
            const product = await db.local_inventory.get(item.id);
            if (product) {
                await db.local_inventory.update(item.id, {
                    stock: product.stock - item.qty
                });
            }
        }

        // ج. إضافة الفاتورة لطابور المزامنة للرفع السحابي لاحقاً
        await db.sync_queue.add({
            operation_type: 'insert_sale',
            data_payload: invoiceData
        });

        // تحديث حالة المؤشر في الشاشة
        updateSyncIndicator();

    }).catch(err => {
        console.error("خطأ حرج في تسجيل الفاتورة محلياً:", err);
        throw err; // رمي الخطأ ليتم التقاطه وإظهاره للكاشير في app.js
    });
}

// 3. محرك المزامنة الخلفي (Background Sync Engine)
let isSyncing = false;

async function processSyncQueue() {
    // التوقف فوراً إذا لم يكن هناك إنترنت، أو إذا كانت هناك مزامنة جارية بالفعل
    if (!navigator.onLine || isSyncing) {
        updateSyncIndicator();
        return;
    }

    // جلب معرف العميل (Tenant ID) المحفوظ محلياً بواسطة بوابة superadmin.js
    const tenantId = localStorage.getItem('xfine_tenant_id');
    if (!tenantId) return; // النظام غير مفعل برخصة صالحة حتى الآن

    isSyncing = true;
    updateSyncIndicator();

    try {
        // جلب كل العمليات المعلقة في الطابور المحلي
        const pendingTasks = await db.sync_queue.toArray();

        if (pendingTasks.length === 0) {
            isSyncing = false;
            updateSyncIndicator();
            return; // لا يوجد فواتير متأخرة
        }

        for (const task of pendingTasks) {
            if (task.operation_type === 'insert_sale') {
                // تجهيز البيانات للسحابة (إضافة tenant_id لعزل بيانات هذا العميل)
                const cloudData = {
                    tenant_id: tenantId,
                    invoice_data_json: task.data_payload,
                    total: task.data_payload.total
                };

                // المتغير 'supabase' سيكون معرفاً عالمياً قادماً من ملف superadmin.js
                const { error } = await supabase
                    .from('cloud_sales')
                    .insert([cloudData]);

                if (!error) {
                    // إذا نجح الرفع السحابي، احذف الفاتورة من طابور المهام المحلي
                    await db.sync_queue.delete(task.id);
                } else {
                    console.error("فشل الرفع للسحابة، سيتم المحاولة لاحقاً:", error);
                    break; // إيقاف المزامنة مؤقتاً لتجنب تكرار الأخطاء إذا كان السيرفر يعاني من ضغط
                }
            }
        }
    } catch (error) {
        console.error("خطأ عام في محرك المزامنة الخفي:", error);
    } finally {
        isSyncing = false;
        updateSyncIndicator();
    }
}

// 4. نظام مراقبة حالة الاتصال والمزامنة (UI Status)
function updateSyncIndicator() {
    const syncStatus = document.getElementById('sync-status');
    if (!syncStatus) return;

    if (!navigator.onLine) {
        syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span> غير متصل (أوفلاين)';
        syncStatus.className = 'px-3 py-1 bg-red-500/20 text-red-500 text-xs rounded-full border border-red-500/50 flex items-center gap-2 transition-colors';
    } else {
        // التأكد من عدد الفواتير المعلقة في الطابور
        db.sync_queue.count().then(count => {
            if (count > 0) {
                syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> جاري المزامنة...';
                syncStatus.className = 'px-3 py-1 bg-yellow-500/20 text-yellow-600 text-xs rounded-full border border-yellow-500/50 flex items-center gap-2 transition-colors';
            } else {
                syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> متصل ومزامن';
                syncStatus.className = 'px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50 flex items-center gap-2 transition-colors';
            }
        }).catch(() => {});
    }
}

// 5. بروتوكول التشغيل التلقائي (Cron Job)
// تشغيل المزامنة الخفية كل 10 ثوانٍ في الخلفية دون إزعاج الكاشير
setInterval(processSyncQueue, 10000);

// مراقبة الاتصال اللحظي لتفعيل المزامنة فور عودة الإنترنت
window.addEventListener('online', () => {
    updateSyncIndicator();
    processSyncQueue();
});
window.addEventListener('offline', () => {
    updateSyncIndicator();
});
