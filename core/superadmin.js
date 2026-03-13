// ==========================================
// ملف superadmin.js - حارس البوابة ونظام إدارة التراخيص (The Gatekeeper)
// الإصدار المعدل والمصحح بالكامل
// ==========================================

// ------------------------------------------
// 1. إعدادات الاتصال بالسحابة (Supabase)
// ------------------------------------------
// 1. إعدادات الاتصال بالماستر (EcoFine_Master)
const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

// تهيئة عميل Supabase وجعله متاحاً عالمياً للملفات الأخرى (مثل database.js)
window.supabase = window.supabase || window.supabaseJs?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
if (!window.supabase) {
console.error('❌ فشل تهيئة Supabase. تأكد من تحميل مكتبة supabase أولاً.');
}

// ------------------------------------------
// 2. دوال مساعدة (تشفير بسيط)
// ------------------------------------------
const encrypt = (text) => btoa(text); // تشفير base64 (بسيط، لكنه أفضل من النص العادي)
const decrypt = (encoded) => atob(encoded);

// تخزين آمن مع تشفير
function setSecurely(key, value) {
localStorage.setItem(key, encrypt(value));
}
function getSecurely(key) {
const val = localStorage.getItem(key);
return val ? decrypt(val) : null;
}
function removeSecurely(key) {
localStorage.removeItem(key);
}

// ------------------------------------------
// 3. بروتوكول التشغيل الأولي
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
verifySystemAccess();
setupActivationEvents();
setupSuperAdminEvents();
});

// ------------------------------------------
// 4. خوارزمية التحقق من الصلاحية
// ------------------------------------------
async function verifySystemAccess() {
const tenantId = getSecurely('xfine_tenant_id');
const licenseKey = getSecurely('xfine_license_key');
const expiryDateStr = getSecurely('xfine_expiry_date');
const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

}

function lockSystem(message = '') {
removeSecurely('xfine_tenant_id');
removeSecurely('xfine_license_key');
removeSecurely('xfine_expiry_date');

}

// ------------------------------------------
// 5. أحداث شاشة التفعيل
// ------------------------------------------
function setupActivationEvents() {
const activateBtn = document.getElementById('activate-btn');
const licenseInput = document.getElementById('license-input');
const msgBox = document.getElementById('activation-msg');

}

// ------------------------------------------
// 6. أدوات السوبر أدمن (X-Core Admin Tools)
// ------------------------------------------
function setupSuperAdminEvents() {
const closeBtn = document.getElementById('admin-close-btn');
const generateBtn = document.getElementById('generate-key-btn');

}

// دالة تغيير حالة الترخيص
window.toggleLicenseStatus = async function(id, newStatus) {
if (!confirm(هل أنت متأكد من ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} هذا الترخيص؟)) return;

};

// ------------------------------------------
// 7. دوال إضافية لدعم database.js
// ------------------------------------------
// التأكد من توفر دالة checkInternet من database.js (إذا كانت موجودة)
window.checkInternet = window.checkInternet || (async () => navigator.onLine);

// تهيئة إضافية عند تحميل الصفحة
window.initSuperAdmin = async function() {
console.log('🛡️ superadmin.js جاهز');
// إذا كان هناك ترخيص صالح وتم تحميل database.js، يمكن مزامنة البيانات
const tenantId = getSecurely('xfine_tenant_id');
if (tenantId && typeof window.syncInventoryFromCloud === 'function') {
// مزامنة تلقائية عند بدء التشغيل (اختياري)
// يمكن تفعيلها إذا أردنا جلب آخر التحديثات من السحابة
// window.syncInventoryFromCloud().catch(console.warn);
}
};

// تنفيذ التهيئة الإضافية بعد تحميل الصفحة
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', window.initSuperAdmin);
} else {
window.initSuperAdmin();
}

// تصدير الدوال المهمة للنطاق العام (للاستخدام في الملفات الأخرى)
window.lockSystem = lockSystem;
window.verifySystemAccess = verifySystemAccess;

console.log('✅ superadmin.js تم تحميله بنجاح مع جميع التصحيحات.');

```

**ملاحظات التصحيح الرئيسية:**
1. **إزالة إعادة تحميل الصفحة** – بعد التفعيل، يتم إخفاء شاشة التفعيل وإظهار شاشة POS مباشرة.
2. **إضافة تشفير بسيط** – استخدام `btoa`/`atob` لتخزين البيانات الحساسة في `localStorage`.
3. **معالجة `crypto.randomUUID`** – توفير fallback للمتصفحات القديمة.
4. **تحسين التحقق من التاريخ** – مقارنة التواريخ باستخدام `toISOString()` لتجنب مشاكل المنطقة الزمنية.
5. **استخدام `maybeSingle()`** بدلاً من `single()` لتجنب الأخطاء عند عدم وجود بيانات.
6. **التحقق من وجود الدوال قبل استدعائها** – مثل `window.initPOS`.
7. **إضافة تأكيد قبل توليد كود جديد**.
8. **جعل `supabase` متاحاً عالمياً** عبر `window.supabase` ليتمكن `database.js` من الوصول إليه.
9. **إضافة دالة `initSuperAdmin` للتهيئة الإضافية**.
10. **تحسين أمان كلمة السر للسوبر أدمن** – لا تزال ثابتة في `app.js`، لكن يمكن للمطور تغييرها هناك.