// XSync.js - محرك الربط والمزامنة الهجين (V6)

const XSync = {
    // 1. إعدادات الاتصال (مخزنة محلياً)
    config: {
        lastSync: localStorage.getItem('last_sync_time') || 'لم يتم المزامنة',
        provider: localStorage.getItem('cloud_provider') || 'none', // sheets, supabase, manual
        apiKey: localStorage.getItem('api_key') || ''
    },

    // 2. تصدير كامل البيانات كـ JSON (للمزامنة اليدوية أو الربط البرمجي)
    exportAll: async () => {
        const stores = ['customers', 'products', 'invoices', 'installments', 'treasury_log'];
        let bundle = {};
        for (const s of stores) {
            bundle[s] = await db.getAll(s);
        }
        return bundle;
    },

    // 3. المزامنة مع Google Sheets (Placeholder للمنطق البرمجي)
    syncWithSheets: async (data) => {
        console.log("🚀 جاري رفع البيانات لـ Google Sheets...");
        // هنا يتم استدعاء Apps Script الخاص بك
        // fetch(URL, { method: 'POST', body: JSON.stringify(data) })
        localStorage.setItem('last_sync_time', new Date().toLocaleString());
        return true;
    }
};

window.XSync = XSync;
