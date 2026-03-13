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
local_inventory: 'id, product_name, price, stock, cloud_product_id', // أضفنا cloud_product_id للربط مع السحابة
local_sales: 'invoice_id, timestamp',
sync_queue: '++id, operation_type, entity_id, attempts, last_attempt'
});

// ترقية قاعدة البيانات للإصدار 2 (إذا لزم الأمر في المستقبل)
// db.version(2).stores({ ... });

// ------------------------------------------
// 2. دوال مساعدة (Utilities)
// ------------------------------------------

/**

· التحقق من الاتصال الفعلي بالإنترنت عبر محاولة الوصول إلى خادم موثوق (Supabase)
· @returns {Promise<boolean>}
  */
  window.checkInternet = async function() {
  if (!navigator.onLine) return false; // سريع إذا كان المتصفح يعرف أنه غير متصل
  if (!ensureSupabase()) return false;
  try {
  // محاولة جلب حد أدنى من البيانات (أي استعلام خفيف) للتحقق من الاتصال الفعلي
  const { error } = await supabase.from('licenses').select('id').limit(1).maybeSingle();
  // إذا لم يكن هناك خطأ في الاتصال (وليس بالضرورة وجود بيانات)
  return !error || error.message?.includes('Failed to fetch') === false; 
  } catch (err) {
  console.warn('⚠️ فشل الاتصال بالإنترنت (فحص الخادم):', err);
  return false;
  }
  };

/**

· تحديث مؤشر حالة المزامنة في الواجهة
  */
  async function updateSyncIndicator() {
  const syncStatus = document.getElementById('sync-status');
  if (!syncStatus) return;
  const isOnline = await checkInternet(); // نستخدم الفحص الفعلي
  const pendingCount = await db.sync_queue.count().catch(() => 0);
  if (!isOnline) {
  syncStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span> غير متصل (أوفلاين)';
  syncStatus.className = 'px-3 py-1 bg-red-500/20 text-red-500 text-xs rounded-full border border-red-500/50 flex items-center gap-2 transition-colors';
  } else if (pendingCount > 0) {
  syncStatus.innerHTML = <span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span> في الانتظار: ${pendingCount};
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

· استيراد المنتجات من ملف Excel باستخدام SheetJS
· @param {File} file - ملف الإكسل المرفوع
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
  });
  };

/**

· إضافة منتج جديد يدوياً (يمكن استخدامها من واجهة السوبر أدمن)
  */
  window.addProduct = async function(productData) {
  // التحقق من البيانات
  if (!productData.product_name) throw new Error('اسم المنتج مطلوب');
  const newProduct = {
  id: productData.id || prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)},
  product_name: productData.product_name,
  price: parseFloat(productData.price) || 0,
  stock: parseInt(productData.stock, 10) || 0,
  cloud_product_id: productData.cloud_product_id || null
  };
  await db.local_inventory.put(newProduct);
  return newProduct;
  };

/**

· تحديث منتج
  */
  window.updateProduct = async function(id, updates) {
  await db.local_inventory.update(id, updates);
  };

/**

· حذف منتج
  */
  window.deleteProduct = async function(id) {
  await db.local_inventory.delete(id);
  };

// ------------------------------------------
// 4. دوال إدارة المبيعات والفواتير
// ------------------------------------------

/**

· حفظ الفاتورة محلياً (تُستدعى من app.js)
· @param {Object} invoiceData - بيانات الفاتورة
  */
  window.saveInvoiceToDB = async function(invoiceData) {
  // التحقق من صحة البيانات الأساسية
  if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
  throw new Error('الفاتورة فارغة أو غير صحيحة');
  }
  // إضافة معرف فريد للفاتورة إذا لم يكن موجوداً
  if (!invoiceData.invoice_id) {
  invoiceData.invoice_id = INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)};
  }
  invoiceData.timestamp = invoiceData.timestamp || new Date().toISOString();
  return db.transaction('rw', db.local_sales, db.local_inventory, db.sync_queue, async () => {
  // 1. حفظ الفاتورة في جدول local_sales
  await db.local_sales.add(invoiceData);
  });
  };

/**

· استرجاع الفواتير المحفوظة محلياً
  */
  window.getLocalSales = async function(limit = 100) {
  return await db.local_sales.orderBy('timestamp').reverse().limit(limit).toArray();
  };

// ------------------------------------------
// 5. محرك المزامنة الخلفي (Background Sync)
// ------------------------------------------

let isSyncing = false;

/**

· معالجة طابور المزامنة ورفع البيانات إلى السحابة
  */
  async function processSyncQueue() {
  // التحقق من وجود اتصال فعلي
  const isOnline = await checkInternet();
  if (!isOnline || isSyncing) {
  updateSyncIndicator();
  return;
  }
  const tenantId = localStorage.getItem('xfine_tenant_id');
  if (!tenantId) return; // النظام غير مفعل
  isSyncing = true;
  updateSyncIndicator();
  try {
  // جلب المهام المعلقة (مرتبة حسب الأقدم)
  const pendingTasks = await db.sync_queue.orderBy('id').toArray();
  } catch (error) {
  console.error('خطأ عام في محرك المزامنة:', error);
  } finally {
  isSyncing = false;
  updateSyncIndicator();
  }
  }

/**

· معالجة عملية إدراج فاتورة في السحابة
  */
  async function processInsertSale(task, tenantId) {
  try {
  // 1. إدراج الفاتورة في cloud_sales
  const cloudData = {
  tenant_id: tenantId,
  invoice_data_json: task.data_payload,
  total: task.data_payload.total,
  created_at: new Date().toISOString()
  };
  } catch (error) {
  console.error('فشل في معالجة مهمة المزامنة:', error);
  }
  }

/**

· مزامنة المخزون من السحابة إلى المحلي (تحديث الأسعار والكميات)
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
  // تحديث المخزون المحلي
  await db.transaction('rw', db.local_inventory, async () => {
  for (const prod of cloudProducts) {
  await db.local_inventory.put({
  id: prod.id, // استخدام نفس id السحابي
  product_name: prod.product_name,
  price: prod.price,
  stock: prod.stock,
  cloud_product_id: prod.id
  });
  }
  });
  // تحديث الواجهة
  if (typeof window.loadProducts === 'function') {
  window.loadProducts();
  }
  alert(✅ تم تحديث المخزون المحلي من السحابة (${cloudProducts.length} منتج).);
  };

// ------------------------------------------
// 6. التشغيل الدوري والاستماع للأحداث
// ------------------------------------------

// تشغيل المزامنة كل 10 ثوانٍ (مع مراعاة حالة الاتصال)
setInterval(() => {
processSyncQueue().catch(console.error);
}, 10000);

// الاستماع لتغير حالة الاتصال
window.addEventListener('online', () => {
updateSyncIndicator();
processSyncQueue();
});
window.addEventListener('offline', () => {
updateSyncIndicator();
});

// تحديث المؤشر عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
updateSyncIndicator();
});

// ------------------------------------------
// 7. دوال إضافية للتصدير والنسخ الاحتياطي
// ------------------------------------------

/**

· تصدير جميع البيانات المحلية (للنسخ الاحتياطي)
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
  a.download = backup_${new Date().toISOString().slice(0,10)}.json;
  a.click();
  URL.revokeObjectURL(url);
  };

/**

· استيراد نسخة احتياطية (مع تحذير)
  */
  window.importBackup = async function(file) {
  if (!confirm('⚠️ استيراد النسخة الاحتياطية سوف يستبدل جميع البيانات الحالية. هل أنت متأكد؟')) {
  return;
  }
  try {
  const text = await file.text();
  const backup = JSON.parse(text);
  } catch (err) {
  console.error('❌ فشل استيراد النسخة الاحتياطية:', err);
  alert(فشل الاستيراد: ${err.message});
  }
  };

// ------------------------------------------
// 8. تصدير الدوال المطلوبة إلى النطاق العام
// ------------------------------------------
window.db = db;
window.updateSyncIndicator = updateSyncIndicator;

console.log('✅ database.js تم تحميله بنجاح مع جميع التحسينات.');

// تصدير الدوال الإضافية المطلوبة
window.processSyncQueue = processSyncQueue;
window.processInsertSale = processInsertSale;

// دالة تهيئة إضافية للتحقق من البيئة
window.initDatabase = async function() {
await db.open();
console.log('📦 قاعدة البيانات المحلية جاهزة');
updateSyncIndicator();
return db;
};