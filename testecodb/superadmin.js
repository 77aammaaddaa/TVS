// superadmin.js - لوحة تحكم السوبر أدمن الكاملة مع بيانات الماستر
// ============================================================

// ==========================
// 1. تهيئة عميل Supabase للماستر
// ==========================
const MASTER_URL = 'https://pyrcpouvcvjkgpjyuafz.supabase.co';
const MASTER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cmNwb3V2Y3Zqa2dwanl1YWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODc4NDgsImV4cCI6MjA4ODA2Mzg0OH0.vhrkZgIAh4Zp1TjLjwvelU5x31eSZZN5fBaPiaVKHCk';

let masterSupabase;
try {
    masterSupabase = supabase.createClient(MASTER_URL, MASTER_KEY);
    window.masterSupabase = masterSupabase; // إتاحته للعالمية
} catch (e) {
    console.error('❌ فشل تهيئة Supabase للماستر:', e);
}

// ==========================
// 2. دوال التخزين الآمن (مطابقة للتيستر)
// ==========================
const encrypt = (text) => btoa(unescape(encodeURIComponent(text)));
const decrypt = (encoded) => {
    try {
        return decodeURIComponent(escape(atob(encoded)));
    } catch (e) {
        return null;
    }
};

function setSecurely(key, value) {
    localStorage.setItem(key, encrypt(value));
}

function getSecurely(key) {
    const val = localStorage.getItem(key);
    return val ? decrypt(val) : null;
}

// ==========================
// 3. دالة التحقق من الوصول (verifySystemAccess) - المقدمة من المستخدم
// ==========================
async function verifySystemAccess() {
    const tenantId = getSecurely('xfine_tenant_id');
    const licenseKey = getSecurely('xfine_license_key');
    const expiry = getSecurely('xfine_expiry_date');
    const clientUrl = getSecurely('xfine_client_db_url');
    const clientKey = getSecurely('xfine_client_db_key');

    if (!tenantId || !licenseKey || !expiry || !clientUrl || !clientKey || new Date(expiry) < new Date()) {
        showActivation(true);
        return;
    }

    // التحقق من صحة الترخيص في قاعدة الماستر
    if (navigator.onLine) {
        const { data, error } = await masterSupabase
            .from('licenses')
            .select('status')
            .eq('license_key', licenseKey)
            .maybeSingle();

        if (error || !data || data.status !== 'active') {
            alert("الترخيص موقوف.");
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
    if (act) act.classList.toggle('hidden-screen', !show);
    if (pos) pos.classList.toggle('hidden-screen', show);
}

// ==========================
// 4. متغيرات السوبر أدمن العامة
// ==========================
let currentEditId = null;
let pollingInterval = null;

// ==========================
// 5. تهيئة أحداث السوبر أدمن
// ==========================
document.addEventListener('DOMContentLoaded', () => {
    // أزرار السوبر أدمن
    const adminCloseBtn = document.getElementById('admin-close-btn');
    if (adminCloseBtn) adminCloseBtn.addEventListener('click', closeSuperAdmin);

    const generateKeyBtn = document.getElementById('generate-key-btn');
    if (generateKeyBtn) generateKeyBtn.addEventListener('click', () => showLicenseModal());

    const cancelLicenseBtn = document.getElementById('cancel-license-btn');
    if (cancelLicenseBtn) cancelLicenseBtn.addEventListener('click', hideLicenseModal);

    const saveLicenseBtn = document.getElementById('save-license-btn');
    if (saveLicenseBtn) saveLicenseBtn.addEventListener('click', saveLicense);

    // مراقب فتح/غلق شاشة السوبر أدمن لبدء/إيقاف التحديث الدوري
    const superAdminScreen = document.getElementById('superadmin-screen');
    if (superAdminScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isHidden = superAdminScreen.classList.contains('hidden-screen');
                    if (!isHidden) {
                        startPolling();
                        loadLicenses();
                    } else {
                        stopPolling();
                    }
                }
            });
        });
        observer.observe(superAdminScreen, { attributes: true });
    }
});

// ==========================
// 6. دوال فتح وإغلاق شاشة السوبر أدمن
// ==========================
function openSuperAdmin() {
    document.getElementById('pos-screen')?.classList.add('hidden-screen');
    document.getElementById('superadmin-screen')?.classList.remove('hidden-screen');
}

function closeSuperAdmin() {
    document.getElementById('superadmin-screen')?.classList.add('hidden-screen');
    document.getElementById('pos-screen')?.classList.remove('hidden-screen');
}

window.openSuperAdmin = openSuperAdmin; // للاستخدام من الباب السري

// ==========================
// 7. دوال مودال الترخيص
// ==========================
function showLicenseModal(licenseData = null) {
    const modal = document.getElementById('license-modal');
    if (!modal) return;

    if (licenseData) {
        currentEditId = licenseData.id;
        document.getElementById('license-tenant-name').value = licenseData.tenant_name || '';
        document.getElementById('license-tenant-id').value = licenseData.tenant_id || '';
        document.getElementById('license-key').value = licenseData.license_key || '';
        document.getElementById('license-expiry').value = licenseData.expiry_date ? licenseData.expiry_date.split('T')[0] : '';
        document.getElementById('license-status').value = licenseData.status || 'active';
        document.getElementById('license-client-url').value = licenseData.client_supabase_url || '';
        document.getElementById('license-client-key').value = licenseData.client_supabase_anon_key || '';
    } else {
        currentEditId = null;
        document.getElementById('license-tenant-name').value = '';
        document.getElementById('license-tenant-id').value = '';
        document.getElementById('license-key').value = generateLicenseKey();
        document.getElementById('license-expiry').value = getDefaultExpiry();
        document.getElementById('license-status').value = 'active';
        document.getElementById('license-client-url').value = MASTER_URL;
        document.getElementById('license-client-key').value = MASTER_KEY;
    }

    modal.classList.remove('hidden');
}

function hideLicenseModal() {
    const modal = document.getElementById('license-modal');
    if (modal) modal.classList.add('hidden');
    currentEditId = null;
}

function generateLicenseKey() {
    return '7X-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getDefaultExpiry() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
}

// ==========================
// 8. حفظ الترخيص (إضافة/تحديث)
// ==========================
async function saveLicense() {
    const tenantName = document.getElementById('license-tenant-name').value.trim();
    const tenantId = document.getElementById('license-tenant-id').value.trim();
    const licenseKey = document.getElementById('license-key').value.trim();
    const expiryDate = document.getElementById('license-expiry').value;
    const status = document.getElementById('license-status').value;
    const clientUrl = document.getElementById('license-client-url').value.trim();
    const clientKey = document.getElementById('license-client-key').value.trim();

    if (!tenantName || !tenantId || !licenseKey || !expiryDate || !status || !clientUrl || !clientKey) {
        alert('جميع الحقول مطلوبة');
        return;
    }

    const expiryISO = new Date(expiryDate).toISOString();

    const licenseData = {
        tenant_name: tenantName,
        tenant_id: tenantId,
        license_key: licenseKey,
        expiry_date: expiryISO,
        status: status,
        client_supabase_url: clientUrl,
        client_supabase_anon_key: clientKey
    };

    try {
        if (currentEditId) {
            const { error } = await masterSupabase
                .from('licenses')
                .update(licenseData)
                .eq('id', currentEditId);
            if (error) throw error;
        } else {
            const { error } = await masterSupabase
                .from('licenses')
                .insert([licenseData]);
            if (error) throw error;
        }

        hideLicenseModal();
        loadLicenses();
    } catch (err) {
        console.error('خطأ في حفظ الترخيص:', err);
        alert('فشل في حفظ الترخيص: ' + err.message);
    }
}

// ==========================
// 9. تحميل وعرض التراخيص
// ==========================
async function loadLicenses() {
    const tableBody = document.getElementById('licenses-list');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4">جاري التحميل من السحابة...</td></tr>';

    try {
        const { data, error } = await masterSupabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4">لا توجد تراخيص مسجلة</td></tr>';
            return;
        }

        let html = '';
        data.forEach(lic => {
            const expiryDate = new Date(lic.expiry_date).toLocaleDateString('ar-EG');
            const statusClass = lic.status === 'active' ? 'text-green-600' : 'text-red-600';
            const statusText = lic.status === 'active' ? 'نشط' : 'موقوف';

            html += `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 border-b">${escapeHtml(lic.tenant_name || '')}</td>
                    <td class="p-3 border-b font-mono">${escapeHtml(lic.tenant_id)}</td>
                    <td class="p-3 border-b font-mono text-blue-600">${escapeHtml(lic.license_key)}</td>
                    <td class="p-3 border-b">${expiryDate}</td>
                    <td class="p-3 border-b font-bold ${statusClass}">${statusText}</td>
                    <td class="p-3 border-b font-mono text-xs truncate max-w-[150px]" title="${escapeHtml(lic.client_supabase_url)}">${escapeHtml(lic.client_supabase_url)}</td>
                    <td class="p-3 border-b font-mono text-xs truncate max-w-[100px]" title="${escapeHtml(lic.client_supabase_anon_key)}">${escapeHtml(lic.client_supabase_anon_key)}</td>
                    <td class="p-3 border-b">
                        <button onclick="editLicense('${lic.id}')" class="text-blue-600 hover:text-blue-800 ml-2" title="تعديل">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                        <button onclick="deleteLicense('${lic.id}')" class="text-red-600 hover:text-red-800" title="حذف">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    } catch (err) {
        console.error('خطأ في تحميل التراخيص:', err);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-red-500">فشل التحميل: ${err.message}</td></tr>`;
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================
// 10. دوال التعديل والحذف
// ==========================
window.editLicense = async function(id) {
    try {
        const { data, error } = await masterSupabase
            .from('licenses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        showLicenseModal(data);
    } catch (err) {
        console.error('خطأ في جلب بيانات الترخيص:', err);
        alert('فشل في جلب بيانات الترخيص');
    }
};

window.deleteLicense = async function(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الترخيص؟')) return;

    try {
        const { error } = await masterSupabase
            .from('licenses')
            .delete()
            .eq('id', id);
        if (error) throw error;

        loadLicenses();
    } catch (err) {
        console.error('خطأ في حذف الترخيص:', err);
        alert('فشل في الحذف: ' + err.message);
    }
};

// ==========================
// 11. التحديث الدوري (Polling)
// ==========================
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        const superAdminScreen = document.getElementById('superadmin-screen');
        if (superAdminScreen && !superAdminScreen.classList.contains('hidden-screen')) {
            loadLicenses();
        }
    }, 10000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// ==========================
// 12. تصدير verifySystemAccess للنطاق العام
// ==========================
window.verifySystemAccess = verifySystemAccess;
