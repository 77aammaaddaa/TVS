// ==========================================
// ملف superadmin.js - الإصدار الصافي (ممنوع الريلود التلقائي)
// ==========================================

const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

// 1. تهيئة Supabase
try {
    window.supabase = window.supabase || (window.supabaseJs ? window.supabaseJs.createClient(MASTER_URL, MASTER_KEY) : null);
} catch (e) { console.error('Supabase Init Error:', e); }

// 2. دوال التشفير (UTF-8)
const encrypt = (text) => btoa(unescape(encodeURIComponent(text)));
const decrypt = (encoded) => decodeURIComponent(escape(atob(encoded)));

function setSecurely(key, value) { localStorage.setItem(key, encrypt(value)); }
function getSecurely(key) {
    const val = localStorage.getItem(key);
    try { return val ? decrypt(val) : null; } catch(e) { return null; }
}
function removeSecurely(key) { localStorage.removeItem(key); }

// 3. دالة التحقق الرئيسية
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiryDateStr = getSecurely('xfine_expiry_date');

    const activationScreen = document.getElementById('activation-screen');
    const posScreen = document.getElementById('pos-screen');

    // الحالة أ: لو مفيش بيانات أو التاريخ منتهي -> اظهر شاشة التفعيل (بدون ريلود)
    if (!tenantId || !licenseKey || !expiryDateStr || new Date(expiryDateStr) < new Date()) {
        if(activationScreen) activationScreen.classList.remove('hidden-screen');
        if(posScreen) posScreen.classList.add('hidden-screen');
        return; 
    }

    // الحالة ب: لو فيه بيانات، اتأكد من السحابة
    if (navigator.onLine && window.supabase) {
        try {
            const { data, error } = await window.supabase
                .from('licenses')
                .select('status')
                .eq('license_key', licenseKey)
                .maybeSingle();

            if (error || !data || data.status !== 'active') {
                alert("الترخيص موقوف أو غير صالح.");
                forceLock();
                return;
            }
        } catch (e) { console.warn("تعذر فحص السحابة، سنعمل أوفلاين."); }
    }

    // الحالة ج: الدخول للـ POS
    if(activationScreen) activationScreen.classList.add('hidden-screen');
    if(posScreen) posScreen.classList.remove('hidden-screen');
    if (typeof window.initPOS === 'function') window.initPOS();
}

// 4. قفل النظام الفوري
function forceLock() {
    removeSecurely('xfine_tenant_id');
    removeSecurely('xfine_license_key');
    removeSecurely('xfine_expiry_date');
    location.reload(); // الريلود هنا مسموح لأنه بيحصل مرة واحدة بس لما الترخيص يتلغي فعلاً
}

// 5. أحداث التفعيل
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    const msgBox = document.getElementById('activation-msg');

    if (activateBtn) {
        activateBtn.onclick = async () => {
            const key = document.getElementById('license-input').value.trim();
            if (!key) return;

            activateBtn.innerText = "جاري التحقق...";
            try {
                const { data, error } = await window.supabase
                    .from('licenses')
                    .select('*')
                    .eq('license_key', key)
                    .maybeSingle();

                if (error || !data) {
                    if(msgBox) msgBox.innerText = "كود غير صحيح!";
                    activateBtn.innerText = "تفعيل";
                    return;
                }

                setSecurely('xfine_tenant_id', data.tenant_id);
                setSecurely('xfine_license_key', data.license_key);
                setSecurely('xfine_expiry_date', data.expiry_date);
                
                location.reload(); // ريلود مرة واحدة بعد النجاح لبدء النظام
            } catch (e) {
                if(msgBox) msgBox.innerText = "خطأ في الاتصال بالسحابة";
                activateBtn.innerText = "تفعيل";
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    verifySystemAccess();
    setupActivationEvents();
});
