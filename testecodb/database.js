// ==========================================
// ملف database.js - المحرك المالي والمزامنة الهجينة (Hybrid Engine)
// الإصدار المعدل والمصحح بالكامل
// ==========================================

// ------------------------------------------
// 1. التهيئة والإعدادات العامة
// ------------------------------------------

// التأكد من وجود Supabase (يتم تعريفه في superadmin.js)
window.ensureSupabase = function() {
    if (typeof supabase === 'undefined') {
        console.error('❌ لم يتم تهيئة Supabase بعد. تأكد من تحميل superadmin.js أولاً.');
        return false;
    }
    return true;
};

// تهيئة قاعدة البيانات المحلية باستخدام Dexie.js
const db = new Dexie("EcoFineXLiteDB");

// تعريف الجداول المحلية مع تحسين الفهارس لدعم البحث السريع
db.version(1).stores({
    local_inventory: 'id, product_name, price, stock, cloud_product_id',
    local_sales: 'invoice_id, timestamp',
    sync_queue: '++id, operation_type, entity_id, attempts, last_attempt'
});

// ------------------------------------------
// 2. دوال مساعدة (Utilities)
// ------------------------------------------

/**
 * التحقق من الاتصال الفعلي بالإنترنت
 * @returns {Promise<boolean>}
 */
window.checkInternet = async function() {
    if (!navigator.onLine) return false;
    if (!ensureSupabase()) return false;
    
    try {
        const { error } = await supabase.from('licenses').select('id').limit(1).maybeSingle();
        return !error || !error.message?.includes('Failed to fetch');
    } catch (err) {
        console.warn('⚠️ فشل الاتصال بالإنترنت:', err);
        return false;
    }
};

/**
 * تحديث مؤشر حالة المزامنة في الواجهة
 */
async function updateSyncIndicator() {
    const syncStatus = document.getElementById('sync-status');
    if (!syncStatus) return;

    const isOnline = await checkInternet();
    const pendingCount = await db.sync_queue.count().catch(() => 0);

    if (!isOnline) {
        syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span> غير متصل (أوفلاين)';
        syncStatus.className = 'px-3 py-1 bg-red-500/20 text-red-500 text-xs rounded-full border border-red-500/50 flex items-center gap-2 transition-colors';
    } else if (pendingCount > 0) {
        syncStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> في الانتظار: ${pendingCount}`;
        syncStatus.className = 'px-3 py-1 bg-yellow-500/20 text-yellow-600 text-xs rounded-full border border-yellow-500/50 flex items-center gap-2 transition-colors';
    } else {
        syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> متصل ومزامن';
        syncStatus.className = 'px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50 flex items-center gap-2 transition-colors';
    }
}

// ------------------------------------------
// 3. دوال إدارة المخزون (CRUD محلي)
// ------------------------------------------

/**
 * استيراد المنتجات من ملف Excel
 */
window.importExcel = async function(file) {
    if (!file) return;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                // تنسيق البيانات
                const formattedData = jsonData.map((row, index) => ({
                    id: `local_${Date.now()}_${index}`,
                    product_name: row['الاسم'] || row['name'] || 'منتج',
                    price: parseFloat(row['السعر'] || row['price'] || 0),
                    stock: parseInt(row['المخزون'] || row['stock'] || 0),
                    cloud_product_id: null
                }));

                // حفظ في قاعدة البيانات
                await db.transaction('rw', db.local_inventory, async () => {
                    await db.local_inventory.clear();
                    await db.local_inventory.bulkAdd(formattedData);
                });

                alert(`✅ تم استيراد ${formattedData.length} منتج`);
                resolve(formattedData);
            } catch (err) {
                console.error('❌ خطأ في الاستيراد:', err);
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

/**
 * إضافة منتج جديد
 */
window.addProduct = async function(productData) {
    if (!productData.product_name) throw new Error('اسم المنتج مطلوب');
    
    const newProduct = {
        id: productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        product_name: productData.product_name,
        price: parseFloat(productData.price) || 0,
        stock: parseInt(productData.stock, 10) || 0,
        cloud_product_id: productData.cloud_product_id || null
    };
    await db.local_inventory.put(newProduct);
    return newProduct;
};

/**
 * تحديث منتج
 */
window.updateProduct = async function(id, updates) {
    await db.local_inventory.update(id, updates);
};

/**
 * حذف منتج
 */
window.deleteProduct = async function(id) {
    await db.local_inventory.delete(id);
};

// ------------------------------------------
// 4. دوال إدارة المبيعات والفواتير
// ------------------------------------------

/**
 * حفظ الفاتورة محلياً
 */
window.saveInvoiceToDB = async function(invoiceData) {
    if (!invoiceData.items?.length) {
        throw new Error('الفاتورة فارغة');
    }

    if (!invoiceData.invoice_id) {
        invoiceData.invoice_id = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }
    invoiceData.timestamp = invoiceData.timestamp || new Date().toISOString();

    return db.transaction('rw', db.local_sales, db.local_inventory, db.sync_queue, async () => {
        // حفظ الفاتورة
        await db.local_sales.add(invoiceData);

        // خصم المخزون
        for (const item of invoiceData.items) {
            const product = await db.local_inventory.get(item.id);
            if (product) {
                await db.local_inventory.update(item.id, {
                    stock: product.stock - item.qty
                });
            }
        }

        // إضافة للمزامنة
        await db.sync_queue.add({
            operation_type: 'insert_sale',
            entity_id: invoiceData.invoice_id,
            data_payload: invoiceData,
            attempts: 0,
            last_attempt: null
        });

        updateSyncIndicator();
    });
};

/**
 * استرجاع الفواتير المحفوظة
 */
window.getLocalSales = async function(limit = 100) {
    return await db.local_sales
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
};

// ------------------------------------------
// 5. محرك المزامنة الخلفي
// ------------------------------------------

let isSyncing = false;

/**
 * معالجة طابور المزامنة
 */
async function processSyncQueue() {
    const isOnline = await checkInternet();
    if (!isOnline || isSyncing) {
        updateSyncIndicator();
        return;
    }

    const tenantId = localStorage.getItem('xfine_tenant_id');
    if (!tenantId) return;

    isSyncing = true;
    updateSyncIndicator();

    try {
        const pendingTasks = await db.sync_queue.orderBy('id').toArray();

        for (const task of pendingTasks) {
            await db.sync_queue.update(task.id, {
                attempts: (task.attempts || 0) + 1,
                last_attempt: new Date().toISOString()
            });

            if (task.operation_type === 'insert_sale') {
                await processInsertSale(task, tenantId);
            }
        }
    } catch (error) {
        console.error('خطأ في المزامنة:', error);
    } finally {
        isSyncing = false;
        updateSyncIndicator();
    }
}

/**
 * معالجة إدراج فاتورة في السحابة
 */
async function processInsertSale(task, tenantId) {
    try {
        // إدراج الفاتورة
        const cloudData = {
            tenant_id: tenantId,
            invoice_data_json: task.data_payload,
            total: task.data_payload.total,
            created_at: new Date().toISOString()
        };

        const { error: saleError } = await supabase
            .from('cloud_sales')
            .insert([cloudData]);

        if (saleError) throw saleError;

        // تحديث المخزون السحابي
        for (const item of task.data_payload.items) {
            const { data: product } = await supabase
                .from('cloud_inventory')
                .select('stock')
                .eq('id', item.id)
                .eq('tenant_id', tenantId)
                .maybeSingle();

            if (product) {
                await supabase
                    .from('cloud_inventory')
                    .update({ stock: product.stock - item.qty })
                    .eq('id', item.id)
                    .eq('tenant_id', tenantId);
            }
        }

        // حذف المهمة بعد النجاح
        await db.sync_queue.delete(task.id);

    } catch (error) {
        console.error('فشل معالجة المهمة:', error);
        
        if (task.attempts >= 5) {
            console.error('تم تخطي المهمة بعد 5 محاولات فاشلة:', task.id);
        }
    }
}

/**
 * مزامنة المخزون من السحابة
 */
window.syncInventoryFromCloud = async function() {
    const tenantId = localStorage.getItem('xfine_tenant_id');
    if (!tenantId) throw new Error('لا يوجد tenant_id نشط');
    if (!await checkInternet()) throw new Error('لا يوجد اتصال بالإنترنت');

    const { data: cloudProducts, error } = await supabase
        .from('cloud_inventory')
        .select('*')
        .eq('tenant_id', tenantId);

    if (error) throw error;

    await db.transaction('rw', db.local_inventory, async () => {
        for (const prod of cloudProducts) {
            await db.local_inventory.put({
                id: prod.id,
                product_name: prod.product_name,
                price: prod.price,
                stock: prod.stock,
                cloud_product_id: prod.id
            });
        }
    });

    if (typeof window.loadProducts === 'function') {
        window.loadProducts();
    }
    
    alert(`✅ تم تحديث المخزون (${cloudProducts.length} منتج)`);
};

// ------------------------------------------
// 6. التشغيل الدوري
// ------------------------------------------

setInterval(() => {
    processSyncQueue().catch(console.error);
}, 10000);

window.addEventListener('online', () => {
    updateSyncIndicator();
    processSyncQueue();
});

window.addEventListener('offline', () => {
    updateSyncIndicator();
});

document.addEventListener('DOMContentLoaded', () => {
    updateSyncIndicator();
});

// ------------------------------------------
// 7. دوال النسخ الاحتياطي
// ------------------------------------------

/**
 * تصدير البيانات
 */
window.exportLocalData = async function() {
    const inventory = await db.local_inventory.toArray();
    const sales = await db.local_sales.toArray();
    const queue = await db.sync_queue.toArray();

    const exportData = {
        inventory,
        sales,
        queue,
        exportDate: new Date().toISOString(),
        version: 1
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * استيراد نسخة احتياطية
 */
window.importBackup = async function(file) {
    if (!confirm('⚠️ استيراد النسخة الاحتياطية سوف يستبدل جميع البيانات الحالية. هل أنت متأكد؟')) {
        return;
    }

    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.inventory || !backup.sales || !backup.queue) {
            throw new Error('ملف النسخة الاحتياطية غير صالح');
        }

        await db.transaction('rw', db.local_inventory, db.local_sales, db.sync_queue, async () => {
            await db.local_inventory.clear();
            await db.local_sales.clear();
            await db.sync_queue.clear();

            if (backup.inventory.length) await db.local_inventory.bulkAdd(backup.inventory);
            if (backup.sales.length) await db.local_sales.bulkAdd(backup.sales);
            if (backup.queue.length) await db.sync_queue.bulkAdd(backup.queue);
        });

        alert('✅ تم استيراد النسخة الاحتياطية بنجاح');
        if (typeof window.loadProducts === 'function') window.loadProducts();
    } catch (err) {
        console.error('❌ فشل الاستيراد:', err);
        alert(`فشل الاستيراد: ${err.message}`);
    }
};

// ------------------------------------------
// 8. تصدير الدوال
// ------------------------------------------
window.db = db;
window.updateSyncIndicator = updateSyncIndicator;
window.processSyncQueue = processSyncQueue;
window.processInsertSale = processInsertSale;

window.initDatabase = async function() {
    await db.open();
    console.log('📦 قاعدة البيانات المحلية جاهزة');
    updateSyncIndicator();
    return db;
};

console.log('✅ database.js تم تحميله بنجاح');