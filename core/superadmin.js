// ==========================================
// ملف superadmin.js - الإصدار المصحح (بدون حلقة الريلود)
// ==========================================

const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

// تهيئة Supabase
try {
    // حاولنا نسهل الربط عشان مكتبة Supabase v2
    window.supabase = window.supabase || (window.supabaseJs ? window.supabaseJs.createClient(MASTER_URL, MASTER_KEY) : null);
} catch (e) { console.error('Error init Supabase:', e); }

// دوال التشفير (UTF-8 Friendly)
const encrypt = (text) => btoa(unescape(encodeURIComponent(text)));
const decrypt = (encoded) => decodeURIComponent(escape(atob(encoded)));

function setSecurely(key, value) { localStorage.setItem(key, encrypt(value)); }
function getSecurely(key) {
    const val = localStorage.getItem(key);
    try { return val ? decrypt(val) : null; } catch(e) { return null; }
}

// 🛡️ دالة التحقق (تم إصلاح منطق الريلود هنا)
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiryDateStr = getSecurely('xfine_expiry_date');

    const activationScreen = document.getElementById('activation-screen');
    const posScreen = document.getElementById('pos-screen');

    // 1. لو مفيش بيانات تفعيل -> أظهر شاشة التفعيل بس واسكت (ممنوع الريلود)
    if (!tenantId || !licenseKey || !expiryDateStr || new Date(expiryDateStr) < new Date()) {
        if(activationScreen) activationScreen.classList.remove('hidden-screen');
        if(posScreen) posScreen.classList.add('hidden-screen');
        return; 
    }

    // 2. لو فيه بيانات، جرب تتأكد من السحابة لو فيه إنترنت
    if (navigator.onLine && window.supabase) {
        const { data, error } = await window.supabase
            .from('licenses')
            .select('status')
            .eq('license_key', licenseKey)
            .maybeSingle();

        if (error || !data || data.status !== 'active') {
            lockAndReload("الترخيص موقوف.");
            return;
        }
    }

    // 3. كل شيء تمام -> افتح الـ POS
    if(activationScreen) activationScreen.classList.add('hidden-screen');
    if(posScreen) posScreen.classList.remove('hidden-screen');
    if (typeof window.initPOS === 'function') window.initPOS();
}

// دالة القفل مع الريلود (تستخدم فقط في حالة إلغاء ترخيص شغال فعلاً)
function lockAndReload(msg = '') {
    localStorage.clear();
    alert(msg || "تم قفل النظام");
    location.reload(); 
}

// أحداث التفعيل
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    if (!activateBtn) return;

    activateBtn.onclick = async () => {
        const key = document.getElementById('license-input').value.trim();
        if (!key) return;

        activateBtn.innerText = "جاري التحقق...";
        const { data, error } = await window.supabase
            .from('licenses')
            .select('*')
            .eq('license_key', key)
            .maybeSingle();

        if (error || !data) {
            document.getElementById('activation-msg').innerText = "كود غير صحيح!";
            activateBtn.innerText = "تفعيل";
            return;
        }

        setSecurely('xfine_tenant_id', data.tenant_id);
        setSecurely('xfine_license_key', data.license_key);
        setSecurely('xfine_expiry_date', data.expiry_date);
        
        // بعد التفعيل الناجح، الريلود هنا مفيد عشان نبدأ نظيف
        location.reload(); 
    };
}

document.addEventListener('DOMContentLoaded', () => {
    verifySystemAccess();
    setupActivationEvents();
});
