// ==========================================
// ملف superadmin.js - حارس البوابة ونظام إدارة التراخيص (The Gatekeeper)
// ==========================================

// 1. إعدادات الاتصال بالسحابة (Supabase)
// ضع هنا روابط مشروعك من Supabase (استخدم مفتاح Anon المسموح به للعامة فقط)
const SUPABASE_URL = 'ضع_رابط_المشروع_هنا';
const SUPABASE_ANON_KEY = 'ضع_مفتاح_anon_هنا';

// تهيئة عميل Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. بروتوكول التشغيل الأولي (Boot Sequence)
document.addEventListener('DOMContentLoaded', () => {
    verifySystemAccess();
    setupActivationEvents();
    setupSuperAdminEvents();
});

// 3. خوارزمية التحقق من الصلاحية (Access Verification)
async function verifySystemAccess() {
    const tenantId = localStorage.getItem('xfine_tenant_id');
    const licenseKey = localStorage.getItem('xfine_license_key');
    const expiryDate = localStorage.getItem('xfine_expiry_date');

    const activationScreen = document.getElementById('activation-screen');
    const posScreen = document.getElementById('pos-screen');

    // الحالة الأولى: لا يوجد ترخيص محلي أو منتهي الصلاحية
    if (!tenantId || !licenseKey || new Date(expiryDate) < new Date()) {
        lockSystem();
        return;
    }

    // الحالة الثانية: يوجد ترخيص محلي، لكن يجب فحصه سحابياً (إذا توفر الإنترنت)
    // هذا يضمن أنك تستطيع إيقاف العميل عن بعد (Remotely Disable)
    if (navigator.onLine) {
        try {
            const { data, error } = await supabase
                .from('licenses')
                .select('status, expiry_date')
                .eq('license_key', licenseKey)
                .single();

            if (error || !data || data.status === 'inactive' || new Date(data.expiry_date) < new Date()) {
                lockSystem("تم إيقاف الترخيص من قبل الإدارة أو انتهت صلاحيته.");
                return;
            } else {
                // تحديث تاريخ الانتهاء محلياً في حال تم تجديده من السحابة
                localStorage.setItem('xfine_expiry_date', data.expiry_date);
            }
        } catch (err) {
            console.warn("تعذر التحقق السحابي، سيتم العمل بالترخيص المحلي مؤقتاً.");
        }
    }

    // فتح النظام إذا اجتاز الفحص
    activationScreen.classList.add('hidden-screen');
    posScreen.classList.remove('hidden-screen');
    
    // تشغيل محرك الكاشير (الموجود في app.js)
    if (typeof initPOS === "function") {
        initPOS();
    }
}

function lockSystem(msg = "") {
    localStorage.removeItem('xfine_tenant_id');
    localStorage.removeItem('xfine_license_key');
    
    document.getElementById('pos-screen').classList.add('hidden-screen');
    document.getElementById('superadmin-screen').classList.add('hidden-screen');
    document.getElementById('activation-screen').classList.remove('hidden-screen');
    
    if(msg) document.getElementById('activation-msg').innerText = msg;
}

// 4. أحداث شاشة التفعيل (Activation Logic)
function setupActivationEvents() {
    const activateBtn = document.getElementById('activate-btn');
    const licenseInput = document.getElementById('license-input');
    const msgBox = document.getElementById('activation-msg');

    activateBtn.addEventListener('click', async () => {
        const key = licenseInput.value.trim();
        if (!key) {
            msgBox.innerText = "الرجاء إدخال كود التفعيل.";
            return;
        }

        activateBtn.innerText = "جاري التحقق...";
        activateBtn.disabled = true;

        try {
            // البحث عن الكود في السحابة
            const { data, error } = await supabase
                .from('licenses')
                .select('*')
                .eq('license_key', key)
                .single();

            if (error || !data) {
                msgBox.innerText = "كود التفعيل غير صحيح.";
            } else if (data.status === 'inactive') {
                msgBox.innerText = "هذا الكود موقوف. يرجى مراجعة الإدارة.";
            } else if (new Date(data.expiry_date) < new Date()) {
                msgBox.innerText = "كود التفعيل منتهي الصلاحية.";
            } else {
                // تفعيل ناجح: حفظ البيانات محلياً
                localStorage.setItem('xfine_tenant_id', data.tenant_id);
                localStorage.setItem('xfine_license_key', data.license_key);
                localStorage.setItem('xfine_expiry_date', data.expiry_date);
                
                // إعادة التشغيل لفتح الواجهة
                window.location.reload();
            }
        } catch (err) {
            msgBox.innerText = "حدث خطأ في الاتصال بالخادم. تأكد من الإنترنت.";
        }

        activateBtn.innerText = "تفعيل النظام";
        activateBtn.disabled = false;
    });
}

// ==========================================
// 5. أدوات السوبر أدمن (X-Core Admin Tools)
// ==========================================
function setupSuperAdminEvents() {
    // إغلاق لوحة السوبر أدمن
    document.getElementById('admin-close-btn').addEventListener('click', () => {
        document.getElementById('superadmin-screen').classList.add('hidden-screen');
        document.getElementById('pos-screen').classList.remove('hidden-screen');
    });

    // توليد كود جديد
    document.getElementById('generate-key-btn').addEventListener('click', async () => {
        // توليد معرفات عشوائية (UUID-like) للعميل والكود
        const newTenantId = 'T-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const newLicenseKey = 'XFINE-' + crypto.randomUUID().split('-')[0].toUpperCase() + '-' + Date.now().toString().slice(-6);
        
        // صلاحية سنة من الآن
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const newRecord = {
            tenant_id: newTenantId,
            license_key: newLicenseKey,
            status: 'active',
            expiry_date: expiryDate.toISOString()
        };

        const { error } = await supabase.from('licenses').insert([newRecord]);

        const displayBox = document.getElementById('new-key-display');
        displayBox.classList.remove('hidden');

        if (error) {
            displayBox.className = "flex-1 bg-red-100 text-red-800 px-4 py-2 rounded-lg font-mono text-center";
            displayBox.innerText = "فشل توليد الكود: " + error.message;
        } else {
            displayBox.className = "flex-1 bg-green-100 text-green-800 px-4 py-2 rounded-lg font-mono text-center";
            displayBox.innerText = `الكود: ${newLicenseKey} | العميل: ${newTenantId}`;
            loadAdminLicenses(); // تحديث الجدول
        }
    });

    // استدعاء التراخيص عند فتح اللوحة (هذه الدالة تُستدعى من app.js عند كتابة كلمة السر)
    window.loadAdminLicenses = async function() {
        const { data, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false });
        
        if (error) return;

        const tbody = document.getElementById('licenses-list');
        tbody.innerHTML = '';

        data.forEach(lic => {
            const tr = document.createElement('tr');
            const isActive = lic.status === 'active';
            const statusColor = isActive ? 'text-green-600' : 'text-red-600';
            
            tr.innerHTML = `
                <td class="p-3 border-b font-mono">${lic.tenant_id}</td>
                <td class="p-3 border-b font-mono text-blue-600">${lic.license_key}</td>
                <td class="p-3 border-b">${new Date(lic.expiry_date).toLocaleDateString('ar-EG')}</td>
                <td class="p-3 border-b font-bold ${statusColor}">${isActive ? 'نشط' : 'موقوف'}</td>
                <td class="p-3 border-b">
                    <button onclick="toggleLicenseStatus(${lic.id}, '${isActive ? 'inactive' : 'active'}')" 
                            class="px-3 py-1 text-sm rounded ${isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}">
                        ${isActive ? 'إيقاف' : 'تفعيل'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// دالة لتغيير حالة ترخيص عميل عن بعد (إيقاف / تشغيل)
window.toggleLicenseStatus = async function(id, newStatus) {
    if(!confirm(`هل أنت متأكد من ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} هذا الترخيص؟`)) return;
    
    const { error } = await supabase
        .from('licenses')
        .update({ status: newStatus })
        .eq('id', id);

    if (!error) {
        window.loadAdminLicenses(); // تحديث الجدول
    } else {
        alert("حدث خطأ أثناء تحديث الحالة.");
    }
}
