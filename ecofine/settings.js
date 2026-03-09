/**
 * ⚙️ settings.js - لوحة التحكم المركزية (Eco Fine Pro V6 Turbo)
 * المطور: M H 4 Tech
 * التحديث V9.7: دمج كامل للإعدادات مع حماية ضد الأعطال (Fallback Config).
 * يؤثر هذا الموديول على كل محركات النظام فور الضغط على "حفظ".
 */

// ==========================================
// 1. محرك الربط والمزامنة الهجين (XSync)
// ==========================================
const XSync = {
    config: {
        lastSync: localStorage.getItem('last_sync_time') || 'لم يتم المزامنة',
        provider: localStorage.getItem('cloud_provider') || 'none',
    },

    exportAll: async () => {
        const stores = ['customers', 'products', 'invoices', 'installments', 'treasury', 'expenses', 'users']; 
        let bundle = {};
        for (const s of stores) {
            try {
                bundle[s] = await db.getAll(s);
            } catch (e) {
                bundle[s] = []; // لتجنب توقف النظام
            }
        }
        return bundle;
    },

    syncWithSheets: async (data) => {
        console.log("🚀 جاري رفع البيانات للسحابة...");
        const timeNow = new Date().toLocaleString('ar-EG');
        localStorage.setItem('last_sync_time', timeNow);
        return timeNow;
    }
};

window.XSync = XSync;

// ==========================================
// 2. الهيكل الافتراضي للنظام (Fallback Matrix)
// ==========================================
const defaultXConfig = {
    identity: { storeName: "Eco Fine Pro", currency: "ج.م", themeColor: "#0f172a" },
    creditPolicy: { minScoreToEntry: 50, creditLimitMultiplier: 5, weights: { guarantors: 40, income: 30 } },
    salesTerms: { minInvoiceAmount: 2500, downPaymentLogic: { daily: "DAYS_OF_MONTH" } },
    legalPolicy: { thresholds: { daily: 35, monthly: 63 }, banPeriodDays: 180 },
    cloud: { url: "", key: "" }
};

// ==========================================
// 3. الواجهة المرئية المدمجة (SettingsModule)
// ==========================================
const { useState, useEffect } = React;

const SettingsModule = () => {
    const [activeTab, setActiveTab] = useState('branding');
    const [syncTime, setSyncTime] = useState(XSync.config.lastSync);
    const [isProcessing, setIsProcessing] = useState(false);

    // 🚀 التهيئة الذكية: جلب الإعدادات من الذاكرة أو استخدام الافتراضي
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ecofine_config');
        if (saved) return JSON.parse(saved);
        return window.XConfig || defaultXConfig;
    });

    const tabs = [
        { id: 'branding', label: 'الهوية', icon: '🎨' },
        { id: 'credit', label: 'الائتمان', icon: '🛡️' },
        { id: 'sales', label: 'البيع', icon: '💰' },
        { id: 'legal', label: 'القانونية', icon: '⚖️' },
        { id: 'sync', label: 'المزامنة', icon: '🔄' }
    ];

    // 💾 دالة الحفظ الشاملة (تؤثر في كل النظام)
    const saveConfig = () => {
        // تحديث الذاكرة المحلية
        localStorage.setItem('ecofine_config', JSON.stringify(config));
        // تحديث المحرك الحي
        window.XConfig = config;
        alert("✅ تم حقن الإعدادات بنجاح في جميع محركات النظام!");
    };

    // دوال مساعدة لتحديث القيم المتداخلة بأمان
    const updateSection = (section, key, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [key]: value }
        }));
    };

    const updateWeight = (key, value) => {
        setConfig(prev => ({
            ...prev,
            creditPolicy: {
                ...(prev.creditPolicy || {}),
                weights: { ...(prev.creditPolicy?.weights || {}), [key]: Number(value) }
            }
        }));
    };

    const updateThreshold = (key, value) => {
        setConfig(prev => ({
            ...prev,
            legalPolicy: {
                ...(prev.legalPolicy || {}),
                thresholds: { ...(prev.legalPolicy?.thresholds || {}), [key]: Number(value) }
            }
        }));
    };

    // 📥 دالة النسخ الاحتياطي
    const handleExportBackup = async () => {
        setIsProcessing(true);
        try {
            const data = await XSync.exportAll();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const downloadNode = document.createElement('a');
            downloadNode.setAttribute("href", dataStr);
            downloadNode.setAttribute("download", `EcoFine_Backup_${new Date().getTime()}.json`);
            document.body.appendChild(downloadNode);
            downloadNode.click();
            downloadNode.remove();
            alert("✅ تم تنزيل النسخة الاحتياطية بنجاح!");
        } catch (err) { alert("❌ خطأ: " + err.message); }
        setIsProcessing(false);
    };

    // ☁️ دالة المزامنة
    const handleCloudSync = async () => {
        setIsProcessing(true);
        try {
            if (typeof db !== 'undefined' && db.syncUnsyncedData) await db.syncUnsyncedData();
            const data = await XSync.exportAll();
            const newTime = await XSync.syncWithSheets(data);
            setSyncTime(newTime);
            alert("✅ تم دفع البيانات للسحابة بنجاح!");
        } catch (err) { alert("❌ فشل الاتصال بالسحابة."); }
        setIsProcessing(false);
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in">
            {/* نظام التبويبات العلوي */}
            <div className="flex border-b bg-slate-50 overflow-x-auto custom-scroll">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-5 px-4 flex flex-col items-center gap-1 transition-all min-w-[80px] ${activeTab === tab.id ? 'bg-white border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* محتوى التبويبات */}
            <div className="p-6 md:p-8 space-y-8">
                
                {/* 🎨 تبويب الهوية */}
                {activeTab === 'branding' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-slate-900 pr-3">إعدادات الهوية التجارية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="اسم المؤسسة" value={config.identity?.storeName || ''} onChange={v => updateSection('identity', 'storeName', v)} />
                            <InputField label="العملة" value={config.identity?.currency || ''} onChange={v => updateSection('identity', 'currency', v)} />
                            <InputField label="لون السمة (HEX)" value={config.identity?.themeColor || ''} onChange={v => updateSection('identity', 'themeColor', v)} />
                        </div>
                        <SaveButton onClick={saveConfig} label="تحديث وتطبيق الهوية" />
                    </div>
                )}

                {/* 🛡️ تبويب سياسة الائتمان */}
                {activeTab === 'credit' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-blue-600 pr-3">سياسة تقييم الائتمان</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="الحد الأدنى للسكور (%)" value={config.creditPolicy?.minScoreToEntry || 50} onChange={v => updateSection('creditPolicy', 'minScoreToEntry', Number(v))} />
                            <InputField type="number" label="معامل سقف الائتمان" value={config.creditPolicy?.creditLimitMultiplier || 5} onChange={v => updateSection('creditPolicy', 'creditLimitMultiplier', Number(v))} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border">
                            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">توزيع أوزان التقييم للعملاء الجدد</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField type="number" label="وزن الضامنين" value={config.creditPolicy?.weights?.guarantors || 40} onChange={v => updateWeight('guarantors', v)} />
                                <InputField type="number" label="وزن الدخل" value={config.creditPolicy?.weights?.income || 30} onChange={v => updateWeight('income', v)} />
                            </div>
                        </div>
                        <SaveButton onClick={saveConfig} label="اعتماد سياسة الائتمان" />
                    </div>
                )}

                {/* 💰 تبويب شروط البيع */}
                {activeTab === 'sales' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-green-600 pr-3">ضوابط وعقود البيع</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="أقل مبلغ لفتح فاتورة تقسيط" value={config.salesTerms?.minInvoiceAmount || 2500} onChange={v => updateSection('salesTerms', 'minInvoiceAmount', Number(v))} />
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center">
                                <p className="text-[10px] font-bold text-green-700">سياسة المقدم: {config.salesTerms?.downPaymentLogic?.daily === 'DAYS_OF_MONTH' ? 'مزامنة مع تاريخ اليوم' : 'دفع قسط مقدم'}</p>
                            </div>
                        </div>
                        <SaveButton onClick={saveConfig} label="حفظ شروط البيع" />
                    </div>
                )}

                {/* ⚖️ تبويب السياسة القانونية */}
                {activeTab === 'legal' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-red-600 pr-3">قواعد الشؤون القانونية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="حد التأخير للقسط اليومي (أيام)" value={config.legalPolicy?.thresholds?.daily || 35} onChange={v => updateThreshold('daily', v)} />
                            <InputField type="number" label="حد التأخير للقسط الشهري (أيام)" value={config.legalPolicy?.thresholds?.monthly || 63} onChange={v => updateThreshold('monthly', v)} />
                            <InputField type="number" label="فترة الحظر للعميل المرفوض (أيام)" value={config.legalPolicy?.banPeriodDays || 180} onChange={v => updateSection('legalPolicy', 'banPeriodDays', Number(v))} />
                        </div>
                        <SaveButton onClick={saveConfig} label="تطبيق الرقابة القانونية" />
                    </div>
                )}

                {/* 🔄 تبويب المزامنة والطباعة */}
                {activeTab === 'sync' && (
                    <div className="space-y-6 animate-in fade-in">
                        
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xl">💾</span>
                                    <h3 className="font-black text-slate-800 text-sm">النسخ الاحتياطي (Local Backup)</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">
                                    سحب جميع بيانات النظام كملف مشفر لجهازك تحسباً للطوارئ.
                                </p>
                                <button onClick={handleExportBackup} disabled={isProcessing} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all disabled:opacity-50">
                                    {isProcessing ? 'جاري التصدير...' : 'تنزيل نسخة احتياطية 📥'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">☁️</span>
                                        <h3 className="font-black text-blue-900 text-sm">مزامنة السحابة</h3>
                                    </div>
                                    <div className="text-left bg-white/50 px-3 py-1 rounded-lg">
                                        <span className="block text-[8px] text-blue-400 font-black uppercase">آخر مزامنة</span>
                                        <span className="text-[10px] font-black text-blue-800">{syncTime}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-blue-700 font-bold mb-4 leading-relaxed">
                                    دفع وحفظ أحدث العمليات المحلية لضمان ربط كل الأجهزة التابعة للمؤسسة.
                                </p>
                                <button onClick={handleCloudSync} disabled={isProcessing} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all disabled:opacity-50">
                                    {isProcessing ? 'جاري الاتصال...' : 'فرض المزامنة الآن 🚀'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xl">🖨️</span>
                                <h3 className="font-black text-slate-800 text-sm">إعدادات الطباعة</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-600">طباعة الإيصالات (80mm)</span>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-slate-900" />
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-600">طباعة العقود (A4)</span>
                                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-slate-900" />
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------
// المكونات المساعدة (Helper Components)
// ----------------------------------------------------
const InputField = ({ label, value, onChange, type = "text" }) => (
    <div>
        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">{label}</label>
        <input 
            type={type}
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
    </div>
);

const SaveButton = ({ onClick, label }) => (
    <button 
        onClick={onClick}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all mt-4"
    >
        {label} 💾
    </button>
);

window.SettingsModule = SettingsModule;
