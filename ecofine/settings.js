/**
 * ⚙️ settings.js - لوحة التحكم في الإعدادات العامة
 * التصميم: تبويبي (Tabbed UI) - Mobile First
 */

const { useState } = React;

const SettingsModule = () => {
    const [activeTab, setActiveTab] = useState('branding');
    const [config, setConfig] = useState(window.XConfig);

    const tabs = [
        { id: 'branding', label: 'الهوية', icon: '🎨' },
        { id: 'credit', label: 'الائتمان', icon: '🛡️' },
        { id: 'sales', label: 'البيع', icon: '💰' },
        { id: 'legal', label: 'القانونية', icon: '⚖️' }
    ];

    const saveConfig = () => {
        window.XConfig = config;
        // هنا يمكن إضافة كود لحفظ الـ config في IndexedDB أو LocalStorage
        alert("✅ تم حفظ الإعدادات بنجاح وتطبيقها على المحرك المركزي");
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in">
            {/* 1. نظام التبويبات العلوي */}
            <div className="flex border-b bg-slate-50 overflow-x-auto custom-scroll">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-5 px-4 flex flex-col items-center gap-1 transition-all min-w-[80px] ${activeTab === tab.id ? 'bg-white border-b-2 border-slate-900 text-slate-900' : 'text-slate-400'}`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* 2. محتوى التبويبات */}
            <div className="p-6 md:p-8 space-y-8">
                
                {/* تبويب الهوية */}
                {activeTab === 'branding' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-slate-900 pr-3">إعدادات الهوية التجارية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="اسم المؤسسة" value={config.identity.storeName} onChange={v => setConfig({...config, identity: {...config.identity, storeName: v}})} />
                            <InputField label="العملة" value={config.identity.currency} onChange={v => setConfig({...config, identity: {...config.identity, currency: v}})} />
                            <InputField label="لون السمة (HEX)" value={config.identity.themeColor} onChange={v => setConfig({...config, identity: {...config.identity, themeColor: v}})} />
                        </div>
                    </div>
                )}

                {/* تبويب سياسة الائتمان */}
                {activeTab === 'credit' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-blue-600 pr-3">سياسة تقييم الائتمان</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="الحد الأدنى للسكور" value={config.creditPolicy.minScoreToEntry} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, minScoreToEntry: v}})} />
                            <InputField type="number" label="معامل سقف الائتمان" value={config.creditPolicy.creditLimitMultiplier} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, creditLimitMultiplier: v}})} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border">
                            <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">توزيع أوزان التقييم (100%)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField type="number" label="وزن الضامنين" value={config.creditPolicy.weights.guarantors} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, weights: {...config.creditPolicy.weights, guarantors: v}}})} />
                                <InputField type="number" label="وزن الدخل" value={config.creditPolicy.weights.income} onChange={v => setConfig({...config, creditPolicy: {...config.creditPolicy, weights: {...config.creditPolicy.weights, income: v}}})} />
                            </div>
                        </div>
                    </div>
                )}

                {/* تبويب شروط البيع */}
                {activeTab === 'sales' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-green-600 pr-3">شروط وعقود البيع</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="أقل مبلغ للتقسيط" value={config.salesTerms.minInvoiceAmount} onChange={v => setConfig({...config, salesTerms: {...config.salesTerms, minInvoiceAmount: v}})} />
                            <div className="p-4 bg-green-50 rounded-2xl">
                                <p className="text-[10px] font-bold text-green-700">سياسة التقديمة: {config.salesTerms.downPaymentLogic.daily === 'DAYS_OF_MONTH' ? 'حسب تاريخ اليوم' : 'قسط مقدم'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* تبويب السياسة القانونية */}
                {activeTab === 'legal' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h4 className="text-xs font-black text-slate-800 border-r-4 border-red-600 pr-3">إدارة التحصيل والقانونية</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField type="number" label="حد التقسيط اليومي (يوم)" value={config.legalPolicy.thresholds.daily} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, thresholds: {...config.legalPolicy.thresholds, daily: v}}})} />
                            <InputField type="number" label="حد التقسيط الشهري (يوم)" value={config.legalPolicy.thresholds.monthly} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, thresholds: {...config.legalPolicy.thresholds, monthly: v}}})} />
                            <InputField type="number" label="فترة الحظر (يوم)" value={config.legalPolicy.banPeriodDays} onChange={v => setConfig({...config, legalPolicy: {...config.legalPolicy, banPeriodDays: v}})} />
                        </div>
                    </div>
                )}

                {/* زر الحفظ النهائي */}
                <button 
                    onClick={saveConfig}
                    className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all mt-8"
                >
                    تحديث إعدادات المؤسسة 🚀
                </button>
            </div>
        </div>
    );
};

// مكون حقل الإدخال الفرعي
const InputField = ({ label, value, onChange, type = "text" }) => (
    <div>
        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">{label}</label>
        <input 
            type={type}
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900"
        />
    </div>
);

window.SettingsModule = SettingsModule;
