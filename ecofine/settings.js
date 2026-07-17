/**
 * ⚙️ settings.js - محرك الإعدادات المتقدمة (X-Config Engine V12.0 - Business Logic Only)
 * المطور: Techno Vision Solutions (Mr. X)
 * التحديث: مخصص لإعدادات البيزنس (المدير) وأدوات المطور (المالك) - تم فصل المزامنة لموديول مستقل.
 */

const { useState, useEffect, useMemo } = React;

const SettingsModule = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('branding');
    const [isProcessing, setIsProcessing] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);

    // 🚀 جلب الإعدادات من النظام الحي أو الذاكرة
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ecofine_config');
        if (saved) return JSON.parse(saved);
        return window.XConfig || {}; 
    });

    // 🛡️ تعريف التبويبات بناءً على الصلاحيات (تم إزالة تبويب المزامنة)
    const allTabs = [
        // --- إعدادات البيزنس (تظهر للمدير والمالك) ---
        { id: 'branding', label: 'هوية المؤسسة', icon: '🎨', role: 'MANAGER' },
        { id: 'credit', label: 'شروط الائتمان', icon: '🛡️', role: 'MANAGER' },
        { id: 'sales', label: 'ضوابط البيع', icon: '💰', role: 'MANAGER' },
        { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️', role: 'MANAGER' },
        { id: 'inventory', label: 'المخازن والتنبيهات', icon: '📦', role: 'MANAGER' },
        
        // --- إعدادات النظام التقنية (تظهر للمالك/المطور فقط) ---
        { id: 'advanced', label: 'إعدادات النظام (للمطور)', icon: '💻', role: 'OWNER' }
    ];

    const allowedTabs = useMemo(() => {
        return allTabs.filter(tab => {
            if (currentUser?.role === 'OWNER') return true;
            if (currentUser?.role === 'MANAGER' && tab.role === 'MANAGER') return true;
            return false;
        });
    }, [currentUser]);

    // ⛔ حماية الصفحة بالكامل (بلوك لأي شخص أقل من مدير)
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MANAGER') {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">وصول مرفوض</h2>
                <p className="text-xs text-red-400 font-bold mt-2">هذه اللوحة سيادية، مصرح للإدارة العليا فقط بالدخول إليها.</p>
            </div>
        );
    }

    // جلب سجلات الأخطاء عند فتح تبويب المطور
    useEffect(() => {
        if (activeTab === 'advanced' && currentUser?.role === 'OWNER') {
            if(window.db && window.db.getAll) {
                window.db.getAll('audit_logs').then(logs => {
                    const errors = (logs || []).filter(l => l.severity === 'critical' || l.action.includes('فشل') || l.action.includes('خطأ'));
                    setSystemLogs(errors.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
                }).catch(() => setSystemLogs([]));
            }
        }
    }, [activeTab]);

    // ==========================================
    // 💾 دالة الحفظ لإعدادات البيزنس
    // ==========================================
    const saveConfig = async () => {
        setIsProcessing(true);
        try {
            // تحديث الذاكرة المحلية والمحرك الحي
            localStorage.setItem('ecofine_config', JSON.stringify(config));
            window.XConfig = config;

            // تحديث قاعدة البيانات السحابية الحالية (إن كانت متصلة)
            if (window._supabase && navigator.onLine) {
                const settingRecord = {
                    id: 'global_config',
                    config_data: config,
                    last_updated: new Date().toISOString()
                };
                await window._supabase.from('system_settings').upsert([settingRecord]);
            }

            if (window.XAudit) window.XAudit.log('تعديل إعدادات', 'الإعدادات', `قام ${currentUser.username} بتعديل سياسات البيزنس`, 'warning', currentUser.username);
            alert("✅ تم حقن الإعدادات بنجاح في جميع شرايين النظام!");
        } catch (err) {
            alert("❌ حدث خطأ أثناء الحفظ.");
        } finally {
            setIsProcessing(false);
        }
    };

    const updateSection = (section, key, value) => {
        setConfig(prev => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
    };

    const updateNested = (section, subSection, key, value) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [subSection]: { ...(prev[section]?.[subSection] || {}), [key]: value } }
        }));
    };

    // 🧹 دالة تنظيف الكاش (للمطور)
    const clearSystemCache = () => {
        const confirmClear = confirm("⚠️ تحذير: هذا الإجراء سيقوم بتفريغ ذاكرة التخزين المؤقت للمتصفح. هل أنت متأكد؟");
        if (confirmClear) {
            localStorage.removeItem('ecofine_config');
            alert("تم تفريغ الكاش. يرجى إعادة تحميل الصفحة.");
            location.reload();
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in pb-10 max-w-5xl mx-auto">
            
            {/* هيدر اللوحة */}
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                            <span className="text-3xl">⚙️</span> 
                            {currentUser?.role === 'OWNER' ? 'محرك الإعدادات السيادية (X-Config)' : 'إعدادات إدارة المؤسسة'}
                        </h2>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2">
                            التحكم المطلق في قواعد وشروط البيزنس. أي تغيير هنا يطبق فوراً.
                        </p>
                    </div>
                    {currentUser?.role === 'OWNER' && (
                        <div className="hidden md:flex flex-col items-end">
                            <span className="text-[9px] bg-red-500 text-white px-2 py-1 rounded font-black uppercase tracking-widest animate-pulse">Developer Mode</span>
                            <span className="text-[10px] text-slate-400 mt-1">Business & System Policy</span>
                        </div>
                    )}
                </div>
            </div>

            {/* نظام التبويبات العلوي الديناميكي */}
            <div className="flex border-b bg-slate-50 overflow-x-auto custom-scroll sticky top-0 z-20">
                {allowedTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-all min-w-[140px] whitespace-nowrap ${activeTab === tab.id ? (tab.role === 'OWNER' ? 'bg-slate-900 text-white shadow-sm border-b-2 border-slate-900' : 'bg-white border-b-2 border-blue-600 text-blue-600 shadow-sm') : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'}`}
                    >
                        <span className="text-lg">{tab.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* محتوى التبويبات */}
            <div className="p-6 md:p-8 space-y-8">

                {/* ========================================================= */}
                {/* 🎨 تبويب الهوية */}
                {/* ========================================================= */}
                {activeTab === 'branding' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                            <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                                💡 هذه الإعدادات تنعكس على واجهة النظام، الفواتير المطبوعة، والعقود.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField label="اسم المؤسسة (يظهر في العقود والفواتير)" value={config.identity?.storeName || ''} onChange={v => updateSection('identity', 'storeName', v)} />
                            <InputField label="العملة الافتراضية للتعامل" value={config.identity?.currency || ''} onChange={v => updateSection('identity', 'currency', v)} />
                            <InputField label="لون السمة الأساسي (HEX Code)" value={config.identity?.themeColor || ''} onChange={v => updateSection('identity', 'themeColor', v)} />
                        </div>
                        <SaveButton isProcessing={isProcessing} onClick={saveConfig} label="تحديث وتطبيق الهوية" />
                    </div>
                )}

                {/* ========================================================= */}
                {/* 🛡️ تبويب سياسة الائتمان */}
                {/* ========================================================= */}
                {activeTab === 'credit' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6">
                            <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
                                ⚠️ تغيير هذه القيم سيؤثر على قرارات الموافقة أو الرفض للعملاء الجدد في موديول (الاستعلام).
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField type="number" label="الحد الأدنى للـ X-Score للقبول (%)" value={config.creditPolicy?.minScoreToEntry || 50} onChange={v => updateSection('creditPolicy', 'minScoreToEntry', Number(v))} />
                            <InputField type="number" label="معامل حساب سقف الائتمان (الضعف)" value={config.creditPolicy?.creditLimitMultiplier || 5} onChange={v => updateSection('creditPolicy', 'creditLimitMultiplier', Number(v))} />
                        </div>
                        
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 mt-4">
                            <h4 className="text-[11px] font-black text-slate-700 mb-4 uppercase tracking-widest">توزيع أوزان التقييم (يجب أن يكون المجموع 100)</h4>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <InputField type="number" label="قوة الضامنين" value={config.creditPolicy?.weights?.guarantors || 40} onChange={v => updateNested('creditPolicy', 'weights', 'guarantors', Number(v))} />
                                <InputField type="number" label="استقرار الدخل" value={config.creditPolicy?.weights?.income || 30} onChange={v => updateNested('creditPolicy', 'weights', 'income', Number(v))} />
                                <InputField type="number" label="محل السكن" value={config.creditPolicy?.weights?.residence || 20} onChange={v => updateNested('creditPolicy', 'weights', 'residence', Number(v))} />
                                <InputField type="number" label="صحة الهوية" value={config.creditPolicy?.weights?.identity || 10} onChange={v => updateNested('creditPolicy', 'weights', 'identity', Number(v))} />
                            </div>
                        </div>
                        <SaveButton isProcessing={isProcessing} onClick={saveConfig} label="اعتماد سياسة الائتمان" />
                    </div>
                )}

                {/* ========================================================= */}
                {/* 💰 تبويب شروط البيع */}
                {/* ========================================================= */}
                {activeTab === 'sales' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField type="number" label="أقل مبلغ لفتح فاتورة تقسيط" value={config.salesTerms?.minInvoiceAmount || 2500} onChange={v => updateSection('salesTerms', 'minInvoiceAmount', Number(v))} />
                            
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-2">منطق سداد الدفعة المقدمة</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    value={config.salesTerms?.downPaymentLogic?.monthly || 'ONE_MONTH_PREPAID'}
                                    onChange={e => updateNested('salesTerms', 'downPaymentLogic', 'monthly', e.target.value)}
                                >
                                    <option value="ONE_MONTH_PREPAID">دفع قسط شهر كامل مقدماً</option>
                                    <option value="PERCENTAGE">دفع نسبة مئوية من الفاتورة (20%)</option>
                                    <option value="FLEXIBLE">مرن (كاشير يدخله يدوياً)</option>
                                </select>
                            </div>
                        </div>
                        <SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ شروط البيع" />
                    </div>
                )}

                {/* ========================================================= */}
                {/* ⚖️ تبويب السياسة القانونية */}
                {/* ========================================================= */}
                {activeTab === 'legal' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField type="number" label="يتحول لقضية بعد (أيام) - قسط يومي" value={config.legalPolicy?.thresholds?.daily || 35} onChange={v => updateNested('legalPolicy', 'thresholds', 'daily', Number(v))} />
                            <InputField type="number" label="يتحول لقضية بعد (أيام) - قسط شهري" value={config.legalPolicy?.thresholds?.monthly || 63} onChange={v => updateNested('legalPolicy', 'thresholds', 'monthly', Number(v))} />
                            <InputField type="number" label="فترة حظر العميل المرفوض/المتعثر (أيام)" value={config.legalPolicy?.banPeriodDays || 180} onChange={v => updateSection('legalPolicy', 'banPeriodDays', Number(v))} />
                            <InputField type="number" label="الفاصل بين إشعارات الإنذار (أيام)" value={config.legalPolicy?.warningInterval || 10} onChange={v => updateSection('legalPolicy', 'warningInterval', Number(v))} />
                        </div>
                        <SaveButton isProcessing={isProcessing} onClick={saveConfig} label="تطبيق الرقابة القانونية" />
                    </div>
                )}

                {/* ========================================================= */}
                {/* 📦 تبويب المخازن */}
                {/* ========================================================= */}
                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-in fade-in">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <InputField type="number" label="حد النواقص الافتراضي (تنبيه عند الوصول لـ)" value={config.inventory?.globalMinStock || 3} onChange={v => updateSection('inventory', 'globalMinStock', Number(v))} />
                        </div>
                        <SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ إعدادات المخازن" />
                    </div>
                )}

                {/* ========================================================= */}
                {/* 💻 تبويب إعدادات النظام (للمطور فقط) - Developer Tools */}
                {/* ========================================================= */}
                {activeTab === 'advanced' && currentUser?.role === 'OWNER' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* وحدة التحكم */}
                            <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
                                <h3 className="font-black text-red-800 text-sm mb-2 flex items-center gap-2"><span>⚠️</span> منطقة الخطر (Danger Zone)</h3>
                                <p className="text-[10px] font-bold text-red-600 mb-6">أدوات المطور لتنظيف وإعادة تعيين كاش النظام الأساسي.</p>
                                
                                <button onClick={clearSystemCache} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black text-xs shadow-md transition-all flex justify-center items-center gap-2">
                                    تفريغ الكاش (Clear Cache) 🗑️
                                </button>
                            </div>

                            {/* سجل الأخطاء المصغر */}
                            <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 flex flex-col h-[250px]">
                                <h3 className="font-black text-white text-sm mb-4 flex justify-between items-center">
                                    <span className="flex items-center gap-2"><span>🐞</span> سجل أخطاء النظام</span>
                                    <span className="text-[9px] bg-slate-700 px-2 py-1 rounded text-slate-300">Live</span>
                                </h3>
                                <div className="flex-1 overflow-y-auto custom-scroll bg-black/50 p-3 rounded-xl border border-white/10">
                                    {systemLogs.length > 0 ? systemLogs.map((log, index) => (
                                        <div key={log.id || index} className="mb-3 border-b border-white/5 pb-2 last:border-0">
                                            <p className="text-[9px] text-red-400 font-mono mb-1" dir="ltr">[{new Date(log.timestamp).toLocaleTimeString()}] {log.action}</p>
                                            <p className="text-[10px] text-slate-300 font-bold">{log.details}</p>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-green-400 font-mono text-center mt-10">All systems operational. 🟢</p>
                                    )}
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
// المكونات المساعدة (UI Components)
// ----------------------------------------------------
const InputField = ({ label, value, onChange, type = "text" }) => (
    <div className="group">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 pl-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
        <input 
            type={type}
            value={value} 
            onChange={e => onChange(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
        />
    </div>
);

const SaveButton = ({ onClick, label, isProcessing }) => (
    <button 
        onClick={onClick}
        disabled={isProcessing}
        className="w-full md:w-auto mt-8 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
    >
        {isProcessing ? 'جاري الحفظ...' : label} 💾
    </button>
);

window.SettingsModule = SettingsModule;
