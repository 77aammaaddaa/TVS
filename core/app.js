// ==========================================
// ملف app.js - المتحكم الرئيسي في واجهة الكاشير (POS Controller)
// الإصدار المعدل والمصحح بالكامل
// ==========================================

// ------------------------------------------
// 1. حالة النظام (System State)
// ------------------------------------------
let currentCart = []; // مصفوفة السلة الحالية
let currentProducts = []; // مصفوفة المنتجات المعروضة

// ------------------------------------------
// 2. دوال مساعدة (Utilities)
// ------------------------------------------

/**

· التحقق من وجود قاعدة البيانات وجاهزيتها
  */
  function ensureDB() {
  if (typeof db === 'undefined') {
  console.error('❌ قاعدة البيانات غير معرفة. تأكد من تحميل database.js أولاً.');
  alert('خطأ في تحميل قاعدة البيانات. يرجى تحديث الصفحة.');
  return false;
  }
  return true;
  }

/**

· عرض رسالة خطأ مناسبة
  */
  function showError(message) {
  alert(⚠️ ${message});
  }

// ------------------------------------------
// 3. التهيئة الأولى (Initialization)
// ------------------------------------------
window.initPOS = async function() {
if (!ensureDB()) return;

};

// ------------------------------------------
// 4. تحميل وعرض المنتجات
// ------------------------------------------
window.loadProducts = async function(searchQuery = "") {
if (!ensureDB()) return;

};

function renderProductGrid() {
const grid = document.getElementById('product-grid');
if (!grid) return;

}

// دالة بسيطة لترميز النص لمنع XSS
function escapeHtml(text) {
const div = document.createElement('div');
div.textContent = text;
return div.innerHTML;
}

function formatNumber(num) {
return num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// ------------------------------------------
// 5. إدارة سلة المشتريات
// ------------------------------------------
window.addToCart = function(product) {
if (product.stock <= 0) {
showError('الكمية غير متوفرة في المخزون!');
return;
}

};

window.updateCartQty = function(productId, delta) {
const itemIndex = currentCart.findIndex(item => item.id === productId);
if (itemIndex === -1) return;

};

function renderCart() {
const cartContainer = document.getElementById('cart-items');
if (!cartContainer) return;

}

function calculateTotals() {
const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
const discountInput = document.getElementById('cart-discount');
const discount = parseFloat(discountInput?.value) || 0;

}

// ------------------------------------------
// 6. إعداد مستمعات الأحداث
// ------------------------------------------
function setupEventListeners() {
// شريط البحث
const searchInput = document.getElementById('search-input');
if (searchInput) {
searchInput.addEventListener('input', debounce(async (e) => {
const query = e.target.value.trim();

}

// دالة debounce لتجنب كثرة الاستعلامات
function debounce(func, wait) {
let timeout;
return function executedFunction(...args) {
const later = () => {
clearTimeout(timeout);
func(...args);
};
clearTimeout(timeout);
timeout = setTimeout(later, wait);
};
}

// ------------------------------------------
// 7. استيراد الإكسيل
// ------------------------------------------
window.handleExcelImport = async function(e) {
const file = e.target.files[0];
if (!file) return;

};

// ------------------------------------------
// 8. معالجة الدفع
// ------------------------------------------
window.processCheckout = async function() {
if (currentCart.length === 0) {
showError('السلة فارغة!');
return;
}

};

// ------------------------------------------
// 9. تنظيف عند إغلاق الصفحة (اختياري)
// ------------------------------------------
window.addEventListener('beforeunload', function() {
// يمكن إضافة أي تنظيف ضروري هنا
});

// ------------------------------------------
// 10. تصدير الدوال المطلوبة إلى النطاق العام
// ------------------------------------------
// الدوال التالية متاحة بالفعل عبر window، نضمن وجودها
window.loadProducts = loadProducts;
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.renderCart = renderCart;
window.calculateTotals = calculateTotals;

console.log('✅ app.js تم تحميله بنجاح مع جميع التحسينات.');

```

**التصحيحات الرئيسية التي تمت:**

1. **جعل الدوال معرفة على `window`** لكي يمكن استدعاؤها من الأحداث (مثل `updateCartQty` من onclick).
2. **إضافة دالة `ensureDB`** للتحقق من وجود `db` قبل استخدامه.
3. **إضافة دالة `escapeHtml`** لمنع هجمات XSS.
4. **تحسين دالة `formatNumber`** لإضافة فواصل الآلاف.
5. **إضافة debounce** على شريط البحث لتجنب الاستعلامات المتكررة.
6. **تأكيد المسح عند استيراد إكسيل**.
7. **استخدام `window.importExcel`** من database.js بدلاً من كتابة المنطق محلياً.
8. **تحسين معالجة الأخطاء** وعرض رسائل مناسبة.
9. **إضافة استدعاء `loadAdminLicenses`** عند فتح السوبر أدمن.
10. **تحسين إنشاء معرف الفاتورة** ليكون أكثر تميزاً.
11. **التأكد من وجود العناصر قبل استخدامها** لتجنب الأخطاء.

الآن ملفات المشروع الثلاثة (database.js, superadmin.js, app.js) و index.html أصبحت متكاملة ومصححة بالكامل.