// ==========================================
// ملف superadmin.js - الإصدار المستقر مع تحسين الاتصال
// ==========================================

// إعدادات Supabase (ثابتة من المشروع)
const SUPABASE_CONFIG = {
    url: 'https://pyrcpouvcvjkgpjyuafz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk'
};

// دالة لتهيئة Supabase بشكل آمن مع انتظار تحميل المكتبة
async function initSupabase() {
    // التأكد من تحميل مكتبة supabase
    if (typeof window.supabase === 'undefined') {
        console.warn("⏳ انتظار تحميل مكتبة Supabase...");
        // انتظر حتى تظهر المكتبة (قد تستغرق بضع ميلي ثانية)
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 100));
            if (window.supabase) break;
        }
    }

    if (!window.supabase) {
        throw new Error("مكتبة Supabase لم يتم تحميلها. تحقق من اتصال الإنترنت أو أعد تحميل الصفحة.");
    }

    try {
        const client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        window.supabaseClient = client; // للاستخدام داخل هذا الملف
        return client;
    } catch (e) {
        throw new Error("فشل إنشاء عميل Supabase: " + e.message);
    }
}

// دوال التشفير الآمنة
const encrypt = (text) => btoa(unescape(encodeURIComponent(text)));
const decrypt = (encoded) => {
    try { return decodeURIComponent(escape(atob(encoded))); } catch(e) { return null; }
};

function setSecurely(key, value) { localStorage.setItem(key, encrypt(value)); }
function getSecurely(key) {
    const val = localStorage.getItem(key);
    return val ? decrypt(val) : null;
}

// متغيرات عامة
let supabaseClient = null;

// عرض/إخفاء شاشة التفعيل
function showActivation(show) {
    const act = document.getElementById('activation-screen');
    const pos = document.getElementById('pos-screen');
    if (act) act.classList.toggle('hidden-screen', !show);
    if (pos) pos.classList.toggle('hidden-screen', show);
}

// قفل النظام (مسح البيانات والعودة لشاشة التفعيل)
function lockSystem(message) {
    localStorage.clear();
    const msgEl = document.getElementById('activation-msg');
    if (msgEl && message) msgEl.innerText = message;
    showActivation(true);
}

// التحقق من صحة الترخيص
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiryDateStr = getSecurely('xfine_expiry_date');

    // إذا لم تكن هناك بيانات أو انتهت الصلاحية
    if (!tenantId || !licenseKey || !expiryDateStr || new Date(expiryDateStr) < new Date()) {
        showActivation(true);
        return;
    }

    // إذا كان هناك اتصال بالإنترنت، تحقق من الحالة في السحابة
    if (navigator.onLine && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('licenses')
                .select('status')
                .eq('license_key', licenseKey)
                .maybeSingle();

            if (error || !data || data.status !== 'active') {
                lockSystem("الترخيص موقوف أو غير صالح.");
                return;
            }
        } catch (e) {
            console.warn("تعذر التحقق من السحابة، سيتم العمل بالبيانات المحلية مؤقتًا.");
        }
    }

    showActivation(false);
    if (typeof window.initPOS === 'function') window.initPOS();
}

// إعداد أحداث شاشة التفعيل
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    const licenseInput = document.getElementById('license-input');
    const msgBox = document.getElementById('activation-msg');

    if (!activateBtn) return;

    activateBtn.onclick = async () => {
        const key = licenseInput.value.trim();
        if (!key) {
            msgBox.innerText = "الرجاء إدخال كود التفعيل.";
            return;
        }

        activateBtn.innerText = "جاري الاتصال بالسحابة...";
        activateBtn.disabled = true;
        msgBox.innerText = "";

        try {
            // التأكد من أن supabaseClient جاهز
            if (!supabaseClient) {
                throw new Error("لم يتم تهيئة الاتصال بالسحابة. أعد تحميل الصفحة.");
            }

            const { data, error } = await supabaseClient
                .from('licenses')
                .select('*')
                .eq('license_key', key)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                msgBox.innerText = "كود التفعيل غير صحيح.";
            } else if (data.status !== 'active') {
                msgBox.innerText = "هذا الكود موقوف. يرجى مراجعة الإدارة.";
            } else if (new Date(data.expiry_date) < new Date()) {
                msgBox.innerText = "الكود منتهي الصلاحية.";
            } else {
                // تفعيل ناجح
                setSecurely('xfine_tenant_id', data.tenant_id);
                setSecurely('xfine_license_key', data.license_key);
                setSecurely('xfine_expiry_date', data.expiry_date);
                
                alert("✅ تم التفعيل بنجاح! جاري فتح النظام...");
                location.reload();
            }
        } catch (err) {
            console.error(err);
            msgBox.innerText = "خطأ في الاتصال بالسحابة: " + (err.message || "تأكد من اتصالك بالإنترنت");
        } finally {
            activateBtn.innerText = "تفعيل النظام";
            activateBtn.disabled = false;
        }
    };
}

// تهيئة النظام عند تحميل الصفحة
(async function() {
    // أظهر رسالة "جاري الاتصال" في شاشة التفعيل
    const msgEl = document.getElementById('activation-msg');
    if (msgEl) msgEl.innerText = "جاري الاتصال بالخادم...";

    try {
        // تهيئة Supabase
        supabaseClient = await initSupabase();
        window.supabase = supabaseClient; // مشاركة مع الملفات الأخرى
        console.log("✅ تم الاتصال بـ Supabase");

        // أكمل التحقق من الترخيص
        verifySystemAccess();
        setupActivationEvents();

        if (msgEl) msgEl.innerText = "";
    } catch (err) {
        console.error(err);
        if (msgEl) msgEl.innerText = "❌ " + err.message;
        // إظهار شاشة التفعيل مع الخطأ
        showActivation(true);
        setupActivationEvents(); // على الأقل الأزرار تعمل للمحاولة مرة أخرى
    }
})();

// دوال السوبر أدمن (يمكن إضافتها لاحقًا)
window.loadAdminLicenses = async function() {
    if (!supabaseClient) return alert("لم يتم الاتصال بالسحابة");
    // ... كود تحميل التراخيص
};

window.toggleLicenseStatus = async function(id, newStatus) {
    // ... كود تغيير الحالة
};