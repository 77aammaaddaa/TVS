// ==========================================
// ملف superadmin.js - الإصدار النهائي المعتمد 2.1
// ==========================================

// 1. إعدادات الاتصال (تم تصحيح أسماء المتغيرات)
const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

// تهيئة Supabase (تم تصحيح الاستدعاء)
try {
    window.supabase = window.supabase || (window.supabaseJs ? window.supabaseJs.createClient(MASTER_URL, MASTER_KEY) : null);
    if (!window.supabase) throw new Error("Supabase Library Not Found");
} catch (e) {
    console.error('❌ فشل تهيئة السحابة:', e.message);
}

// 2. دوال التشفير (تم دعم اللغة العربية)
const encrypt = (text) => btoa(unescape(encodeURIComponent(text))); 
const decrypt = (encoded) => decodeURIComponent(escape(atob(encoded)));

function setSecurely(key, value) { localStorage.setItem(key, encrypt(value)); }
function getSecurely(key) {
    const val = localStorage.getItem(key);
    try { return val ? decrypt(val) : null; } catch(e) { return null; }
}
function removeSecurely(key) { localStorage.removeItem(key); }

// 3. خوارزمية التحقق من الصلاحية (تم ملء المنطق المفقود)
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiryDateStr = getSecurely('xfine_expiry_date');

    const activationScreen = document.getElementById('activation-screen');
    const posScreen = document.getElementById('pos-screen');

    if (!tenantId || !licenseKey || new Date(expiryDateStr) < new Date()) {
        lockSystem();
        return;
    }

    // فحص سحابي سريع إذا توفر الإنترنت
    if (navigator.onLine) {
        const { data, error } = await window.supabase
            .from('licenses')
            .select('status')
            .eq('license_key', licenseKey)
            .maybeSingle();

        if (error || !data || data.status !== 'active') {
            lockSystem("تم إيقاف الترخيص من السحابة.");
            return;
        }
    }

    // إخفاء التفعيل وإظهار POS
    if(activationScreen) activationScreen.classList.add('hidden-screen');
    if(posScreen) posScreen.classList.remove('hidden-screen');
    if (typeof window.initPOS === 'function') window.initPOS();
}

function lockSystem(message = '') {
    removeSecurely('xfine_tenant_id');
    removeSecurely('xfine_license_key');
    removeSecurely('xfine_expiry_date');
    location.reload(); // إعادة التحميل لإجبار المستخدم على شاشة التفعيل
}

// 4. أحداث شاشة التفعيل
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    const msgBox = document.getElementById('activation-msg');

    if (activateBtn) {
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
                msgBox.innerText = "كود غير صحيح!";
                activateBtn.innerText = "تفعيل";
                return;
            }

            setSecurely('xfine_tenant_id', data.tenant_id);
            setSecurely('xfine_license_key', data.license_key);
            setSecurely('xfine_expiry_date', data.expiry_date);
            
            verifySystemAccess(); // الانتقال فوراً لشاشة POS
        };
    }
}

// 5. التشغيل
document.addEventListener('DOMContentLoaded', () => {
    verifySystemAccess();
    setupActivationEvents();
});

window.lockSystem = lockSystem;
window.verifySystemAccess = verifySystemAccess;
