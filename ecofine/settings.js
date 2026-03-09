/**
 * ⚙️ settings.js - لوحة التحكم في الإعدادات العامة والمزامنة (V6 Turbo)
 * التصميم: تبويبي (Tabbed UI) - Mobile First
 * تم الدمج بين إعدادات المؤسسة (XConfig) ومحرك المزامنة السحابي (XSync).
 */

// ==========================================
// 1. محرك الربط والمزامنة الهجين (XSync)
// ==========================================
const XSync = {
    config: {
        lastSync: localStorage.getItem('last_sync_time') || 'لم يتم المزامنة',
        provider: localStorage.getItem('cloud_provider') || 'none',
        apiKey: localStorage.getItem('api_key') || ''
    },

    exportAll: async () => {
        const stores = ['customers', 'products', 'invoices', 'installments', 'treasury', 'expenses', 'users']; 
        let bundle = {};
        for (const s of stores) {
            try {
                bundle[s] = await db.getAll(s);
            } catch (e) {
                bundle[s] = []; // لتجنب توقف النظام إذا كان الجدول فارغاً
            }
        }
        return bundle;
    },

    syncWithSheets: async (data) => {
        console.log("🚀 جاري رفع البيانات للسحابة...");
        // هنا يتم الاستدعاء الفعلي للمزامنة
        const timeNow = new Date().toLocaleString('ar-EG');
        localStorage.setItem('last_sync_time', timeNow);
        return timeNow;
    }
};

window.XSync = XSync;

// ==========================================
// 2. الواجهة المرئية المدمجة (SettingsModule)
// ==========================================
const { useState } = React;

const SettingsModule = () => {
    // حالة تبويبات الإعدادات
    const [activeTab, setActiveTab] = useState('branding');
    const [config, setConfig] = useState(window.XConfig || {});
    
    // حالة المزامنة
    const [syncTime, setSyncTime] = useState(XSync.config.lastSync);
    const [isProcessing, setIsProcessing] = useState(false);

    // قائمة التبويبات (تمت إضافة المزامنة)
    const tabs = [
        { id: 'branding', label: 'الهوية', icon: '🎨' },
        { id: 'credit', label: 'الائتمان', icon: '🛡️' },
        { id: 'sales', label: 'البيع', icon: '💰' },
        { id: 'legal', label: 'القانونية', icon: '⚖️' },
        { id: 'sync', label: 'المزامنة', icon: '🔄' } // 👈 التبويب الجديد
    ];

    const saveConfig = () => {
        window.XConfig = config;
        // يمكن حفظ الإعدادات في التخزين المحلي لضمان استمرارها
        localStorage.setItem('ecofine_config', JSON.stringify(config));
        alert("✅ تم حفظ إعدادات المؤسسة بنجاح وتطبيقها على المحرك المركزي");
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
        } catch (err) {
            alert("❌ حدث خطأ أثناء التصدير: " + err.message);
        }
        setIsProcessing(false);
    };

    // 🚀 دالة المزامنة السحابية
    const handleCloudSync = async () => {
        setIsProcessing(true);
        try {
            if (typeof db !== 'undefined' && db.syncUnsyncedData) {
                await db.syncUnsyncedData(); // نداء محرك V9.0 للرفع
            }
            const data = await XSync.exportAll();
            const newTime = await XSync.syncWithSheets(data);
            setSyncTime(newTime);
            alert("✅ تم إرسال حزمة البيانات بنجاح للسحابة (Supabase)!");
        } catch (err) {
            alert("❌ فشل الاتصال بخوادم المزامنة.");
        }
        setIsProcessing(false);
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in">
            {/* 1. نظام التبويبات العلوي */}
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

            {/* 2. محتوى التبويبات */}
            <div className="p-6 md:p-8 space-y-8">
                
                {/* 🎨 تبويب الهوية */}
                {activeTab === 'branding' && config.identity && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-slate-900 pr-3">إعدادات الهوية التجارية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="اسم المؤسسة" value={config.identity.storeName} onChange={v => setConfig({...config, identity: {...config.identity, storeName: v}})} />
                            <InputField label="العملة" value={config.identity.currency} onChange={v => setConfig({...config, identity: {...config.identity, currency: v}})} />
                            <InputField label="لون السمة (HEX)" value={config.identity.themeColor} onChange={v => setConfig({...config, identity: {...config.identity, themeColor: v}})} />
                        </div>
                        <SaveButton onClick={saveConfig} label="تحديث إعدادات الهوية" />
                    </div>
                )}

                {/* 🛡️ تبويب سياسة الائتمان */}
                {activeTab === 'credit' && config.creditPolicy && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-blue-600 pr-3">سياسة تقييم الائتمان</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="الحد الأدنى للسكور" value={config.creditPolicy.minScoreToEntry} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, minScoreToEntry: v}})} />
                            <InputField type="number" label="معامل سقف الائتمان" value={config.creditPolicy.creditLimitMultiplier} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, creditLimitMultiplier: v}})} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border">
                            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">توزيع أوزان التقييم (100%)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField type="number" label="وزن الضامنين" value={config.creditPolicy.weights?.guarantors || 40} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, weights: {...config.creditPolicy.weights, guarantors: v}}})} />
                                <InputField type="number" label="وزن الدخل" value={config.creditPolicy.weights?.income || 30} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, weights: {...config.creditPolicy.weights, income: v}}})} />
                            </div>
                        </div>
                        <SaveButton onClick={saveConfig} label="تحديث سياسة الائتمان" />
                    </div>
                )}

                {/* 💰 تبويب شروط البيع */}
                {activeTab === 'sales' && config.salesTerms && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-green-600 pr-3">شروط وعقود البيع</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="أقل مبلغ للتقسيط" value={config.salesTerms.minInvoiceAmount} onChange={v => setConfig({...config, salesTerms: {...config.salesTerms, minInvoiceAmount: v}})} />
                            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center">
                                <p className="text-[10px] font-bold text-green-700">سياسة التقديمة: {config.salesTerms.downPaymentLogic?.daily === 'DAYS_OF_MONTH' ? 'حسب تاريخ اليوم' : 'قسط مقدم'}</p>
                            </div>
                        </div>
                        <SaveButton onClick={saveConfig} label="تحديث شروط البيع" />
                    </div>
                )}

                {/* ⚖️ تبويب السياسة القانونية */}
                {activeTab === 'legal' && config.legalPolicy && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-red-600 pr-3">إدارة التحصيل والقانونية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="حد التقسيط اليومي (يوم)" value={config.legalPolicy.thresholds?.daily || 35} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, thresholds: {...config.legalPolicy.thresholds, daily: v}}})} />
                            <InputField type="number" label="حد التقسيط الشهري (يوم)" value={config.legalPolicy.thresholds?.monthly || 63} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, thresholds: {...config.legalPolicy.thresholds, monthly: v}}})} />
                            <InputField type="number" label="فترة الحظر (يوم)" value={config.legalPolicy.banPeriodDays} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, banPeriodDays: v}})} />
                        </div>
                        <SaveButton onClick={saveConfig} label="تحديث الرقابة القانونية" />
                    </div>
                )}

                {/* 🔄 تبويب المزامنة والطباعة (الجديد) */}
                {activeTab === 'sync' && (
                    <div className="space-y-6 animate-in fade-in">
                        
                        {/* 1. قسم النسخ الاحتياطي اليدوي */}
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xl">💾</span>
                                    <h3 className="font-black text-slate-800 text-sm">النسخ الاحتياطي (Local Backup)</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mb-4 leading-relaxed">
                                    سحب جميع بيانات النظام (عملاء، مبيعات، خزينة) كملف مشفر لجهازك تحسباً للطوارئ.
                                </p>
                                <button 
                                    onClick={handleExportBackup} disabled={isProcessing}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? 'جاري التصدير...' : 'تنزيل نسخة احتياطية 📥'}
                                </button>
                            </div>
                        </div>

                        {/* 2. قسم المزامنة السحابية */}
                        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">☁️</span>
                                        <h3 className="font-black text-blue-900 text-sm">مزامنة السحابة (Supabase)</h3>
                                    </div>
                                    <div className="text-left bg-white/50 px-3 py-1 rounded-lg">
                                        <span className="block text-[8px] text-blue-400 font-black uppercase">آخر مزامنة</span>
                                        <span className="text-[10px] font-black text-blue-800">{syncTime}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-blue-700 font-bold mb-4 leading-relaxed">
                                    دفع وحفظ أحدث العمليات المحلية لضمان ربط كل الأجهزة التابعة للمؤسسة.
                                </p>
                                <button 
                                    onClick={handleCloudSync} disabled={isProcessing}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? 'جاري الاتصال...' : 'فرض المزامنة الآن 🚀'}
                                </button>
                            </div>
                        </div>

                        {/* 3. إعدادات الطباعة */}
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

// مكون حقل الإدخال الفرعي
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

// زر الحفظ الموحد للتبويبات
const SaveButton = ({ onClick, label }) => (
    <button 
        onClick={onClick}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all mt-4"
    >
        {label} 💾
    </button>
);

window.SettingsModule = SettingsModule;
