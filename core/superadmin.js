// ==========================================
// ملف superadmin.js - الإصدار المعتمد بناءً على X-Tester
// ==========================================

const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

// 1. تهيئة Supabase بنفس الطريقة الناجحة في التيستر
let supabaseClient;
try {
    // نستخدم 'supabase' مباشرة كما نجحت في التيستر
    supabaseClient = supabase.createClient(MASTER_URL, MASTER_KEY);
    window.supabase = supabaseClient; // جعله متاحاً للملفات الأخرى
} catch (e) {
    console.error("❌ فشل تهيئة Supabase:", e);
}

// 2. دوال التشفير الآمنة
const encrypt = (text) => btoa(unescape(encodeURIComponent(text)));
const decrypt = (encoded) => decodeURIComponent(escape(atob(encoded)));

function setSecurely(key, value) { localStorage.setItem(key, encrypt(value)); }
function getSecurely(key) {
    const val = localStorage.getItem(key);
    try { return val ? decrypt(val) : null; } catch(e) { return null; }
}

// 3. التحقق من الصلاحية عند فتح التطبيق
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiryDateStr = getSecurely('xfine_expiry_date');

    const activationScreen = document.getElementById('activation-screen');
    const posScreen = document.getElementById('pos-screen');

    if (!tenantId || !licenseKey || !expiryDateStr || new Date(expiryDateStr) < new Date()) {
        showActivation(true);
        return;
    }

    // فحص سحابي سريع
    if (navigator.onLine && supabaseClient) {
        const { data, error } = await supabaseClient
            .from('licenses')
            .select('status')
            .eq('license_key', licenseKey)
            .maybeSingle();

        if (error || !data || data.status !== 'active') {
            alert("الترخيص موقوف أو غير ساري.");
            localStorage.clear();
            location.reload();
            return;
        }
    }

    showActivation(false);
    if (typeof window.initPOS === 'function') window.initPOS();
}

function showActivation(show) {
    const act = document.getElementById('activation-screen');
    const pos = document.getElementById('pos-screen');
    if(act) act.classList.toggle('hidden-screen', !show);
    if(pos) pos.classList.toggle('hidden-screen', show);
}

// 4. معالجة زر التفعيل (نفس منطق التيستر)
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    const msgBox = document.getElementById('activation-msg');

    if (!activateBtn) return;

    activateBtn.onclick = async () => {
        const key = document.getElementById('license-input').value.trim();
        if (!key) return;

        activateBtn.innerText = "جاري التحقق من السحابة...";
        activateBtn.disabled = true;

        try {
            // تنفيذ الطلب كما في التيستر
            const { data, error } = await supabaseClient
                .from('licenses')
                .select('*')
                .eq('license_key', key)
                .maybeSingle();

            if (error || !data) {
                msgBox.innerText = "كود التفعيل غير صحيح أو منتهي.";
                activateBtn.innerText = "تفعيل";
                activateBtn.disabled = false;
                return;
            }

            // تفعيل ناجح وحفظ البيانات
            setSecurely('xfine_tenant_id', data.tenant_id);
            setSecurely('xfine_license_key', data.license_key);
            setSecurely('xfine_expiry_date', data.expiry_date);
            
            alert("✅ تم التفعيل بنجاح! جاري فتح النظام...");
            location.reload(); 

        } catch (e) {
            msgBox.innerText = "حدث خطأ غير متوقع في الاتصال.";
            activateBtn.innerText = "تفعيل";
            activateBtn.disabled = false;
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    verifySystemAccess();
    setupActivationEvents();
});
