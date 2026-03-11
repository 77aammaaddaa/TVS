/**
 * ⚙️ settings.js - محرك الإعدادات المتقدمة (X-Config Engine V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * التحديث: واجهة مزامنة متقدمة (Supabase / Google Sheets) مع نظام حماية (Fail-Safe) لمنع فقدان البيانات.
 */

const { useState, useEffect, useMemo } = React;

const SettingsModule = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('branding');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(localStorage.getItem('last_sync_time') || 'لم يتم المزامنة بعد');
    const [systemLogs, setSystemLogs] = useState([]);

    // 🛡️ حالات نافذة الأمان (للمزامنة)
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [pendingSyncType, setPendingSyncType] = useState(null);

    // 🚀 جلب الإعدادات من النظام الحي أو الذاكرة
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ecofine_config');
        if (saved) return JSON.parse(saved);
        return window.XConfig || {}; 
    });

    // 🛡️ تعريف التبويبات بناءً على الصلاحيات
    const allTabs = [
        { id: 'branding', label: 'هوية المؤسسة', icon: '🎨', role: 'MANAGER' },
        { id: 'credit', label: 'شروط الائتمان', icon: '🛡️', role: 'MANAGER' },
        { id: 'sales', label: 'ضوابط البيع', icon: '💰', role: 'MANAGER' },
        { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️', role: 'MANAGER' },
        { id: 'inventory', label: 'المخازن والتنبيهات', icon: '📦', role: 'MANAGER' },
        
        // --- إعدادات النظام التقنية (تظهر للمالك/المطور فقط) ---
        { id: 'cloud_sync', label: 'المزامنة والربط السحابي', icon: '☁️', role: 'OWNER' },
        { id: 'advanced', label: 'إعدادات النظام (للمطور)', icon: '💻', role: 'OWNER' }
    ];

    const allowedTabs = useMemo(() => {
        return allTabs.filter(tab => {
            if (currentUser?.role === 'OWNER') return true;
            if (currentUser?.role === 'MANAGER' && tab.role === 'MANAGER') return true;
            return false;
        });
    }, [currentUser]);

    // ⛔ حماية الصفحة بالكامل
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MANAGER') {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">وصول مرفوض</h2>
                <p className="text-xs text-red-400 font-bold mt-2">هذه اللوحة سيادية، مصرح للإدارة العليا فقط بالدخول إليها.</p>
            </div>
        );
    }

    // جلب سجلات الأخطاء
    useEffect(() => {
        if (activeTab === 'advanced' && currentUser?.role === 'OWNER') {
            window.db.getAll('audit_logs').then(logs => {
                const errors = (logs || []).filter(l => l.severity === 'critical' || l.action.includes('فشل') || l.action.includes('خطأ'));
                setSystemLogs(errors.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }).catch(() => setSystemLogs([]));
        }
    }, [activeTab]);

    // ==========================================
    // 💾 دالة الحفظ الشاملة (Local + Cloud)
    // ==========================================
    const saveConfig = async () => {
        setIsProcessing(true);
        try {
            localStorage.setItem('ecofine_config', JSON.stringify(config));
            window.XConfig = config;

            if (window._supabase && navigator.onLine) {
                const settingRecord = {
                    id: 'global_config',
                    config_data: config,
                    last_updated: new Date().toISOString()
                };
                await window._supabase.from('system_settings').upsert([settingRecord]);
            }

            if (window.XAudit) window.XAudit.log('تعديل إعدادات', 'الإعدادات', `قام ${currentUser.username} بتعديل إعدادات النظام`, 'warning', currentUser.username);
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

    // ==========================================
    // ☁️ دوال الربط السحابي الذكية والمزامنة
    // ==========================================
    
    // 1. طلب تغيير إعدادات الربط السحابي (يفتح نافذة الأمان)
    const requestCloudChange = (providerType) => {
        setPendingSyncType(providerType);
        setShowSecurityModal(true);
    };

    // 2. الموافقة وإجبار النظام على المزامنة المحلية قبل تغيير الرابط
    const confirmAndForceSync = async () => {
        setIsProcessing(true);
        try {
            // إجبار المزامنة قبل التغيير لضمان عدم فقد البيانات
            if (navigator.onLine && typeof window.db !== 'undefined' && window.db.syncWithCloud) {
                await window.db.syncWithCloud();
                console.log("تم تأمين البيانات ورفعها للسحابة الحالية قبل التغيير.");
            }
            
            // تحديث الإعدادات وحفظها
            await saveConfig();
            
            setShowSecurityModal(false);
            alert(`✅ تم تأمين البيانات المحلية وتحديث إعدادات ربط (${pendingSyncType}) بنجاح.`);
            
            // طلب إعادة التحميل لتفعيل الإعدادات الجديدة في database.js
            if(confirm("يتطلب النظام إعادة تشغيل لتفعيل الروابط السحابية الجديدة. هل تريد إعادة التشغيل الآن؟")) {
                location.reload();
            }
        } catch(err) {
            alert("❌ حدث خطأ أثناء تأمين البيانات: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in pb-10 max-w-5xl mx-auto relative">
            
            {/* الهيدر */}
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
                            <span className="text-3xl">⚙️</span> 
                            {currentUser?.role === 'OWNER' ? 'محرك الإعدادات السيادية (X-Config)' : 'إعدادات إدارة المؤسسة'}
                        </h2>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2">التحكم المطلق في قواعد وشروط البيزنس. أي تغيير يطبق فوراً.</p>
                    </div>
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

            <div className="p-6 md:p-8 space-y-8">
                
                {/* 🎨 تبويبات البيزنس العادية (مختصرة هنا للتركيز على المزامنة) */}
                {activeTab === 'branding' && (<div className="space-y-6"><InputField label="اسم المؤسسة" value={config.identity?.storeName || ''} onChange={v => updateSection('identity', 'storeName', v)} /><SaveButton isProcessing={isProcessing} onClick={saveConfig} label="تحديث الهوية" /></div>)}
                {activeTab === 'credit' && (<div className="space-y-6"><InputField type="number" label="الحد الأدنى للقبول (%)" value={config.creditPolicy?.minScoreToEntry || 50} onChange={v => updateSection('creditPolicy', 'minScoreToEntry', Number(v))} /><SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ" /></div>)}
                {activeTab === 'sales' && (<div className="space-y-6"><InputField type="number" label="أقل مبلغ لفتح تقسيط" value={config.salesTerms?.minInvoiceAmount || 2500} onChange={v => updateSection('salesTerms', 'minInvoiceAmount', Number(v))} /><SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ" /></div>)}
                {activeTab === 'legal' && (<div className="space-y-6"><InputField type="number" label="قضية بعد (أيام)" value={config.legalPolicy?.thresholds?.daily || 35} onChange={v => updateNested('legalPolicy', 'thresholds', 'daily', Number(v))} /><SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ" /></div>)}
                {activeTab === 'inventory' && (<div className="space-y-6"><InputField type="number" label="حد النواقص الافتراضي" value={config.inventory?.globalMinStock || 3} onChange={v => updateSection('inventory', 'globalMinStock', Number(v))} /><SaveButton isProcessing={isProcessing} onClick={saveConfig} label="حفظ" /></div>)}

                {/* ========================================================= */}
                {/* ☁️ تبويب المزامنة والربط السحابي (الجديد كلياً) */}
                {/* ========================================================= */}
                {activeTab === 'cloud_sync' && currentUser?.role === 'OWNER' && (
                    <div className="space-y-8 animate-in fade-in">
                        
                        {/* رسالة توجيهية */}
                        <div className="bg-slate-100 p-5 rounded-[2rem] border border-slate-200 flex items-start gap-4">
                            <span className="text-3xl">💡</span>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm mb-1">كيف تعمل المزامنة في Eco Fine Pro؟</h4>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                    يتم الاعتماد على <strong>Supabase</strong> كقاعدة بيانات أساسية (لتخزين الفواتير والعملاء بشكل لحظي)، ويمكنك ربط <strong>Google Sheets</strong> كأداة لنسخ التقارير والأرقام النهائية فقط لأغراض التحليل الخارجي والمحاسبين.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* 1. إعدادات Supabase (الأساسي) */}
                            <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 text-xl font-black">⚡</div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-sm">قاعدة البيانات الرئيسية (Supabase)</h3>
                                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Primary Cloud Storage</p>
                                        </div>
                                    </div>
                                    {config.cloudProvider?.supabaseUrl ? <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-200">متصل 🟢</span> : <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black border border-slate-200">غير متصل ⚪</span>}
                                </div>
                                
                                <div className="space-y-4">
                                    <InputField label="Project URL (رابط المشروع)" value={config.cloudProvider?.supabaseUrl || ''} onChange={v => updateNested('cloudProvider', 'supabaseUrl', null, v)} placeholder="https://xxxx.supabase.co" />
                                    <InputField label="Anon / Public Key (مفتاح الربط)" type="password" value={config.cloudProvider?.supabaseKey || ''} onChange={v => updateNested('cloudProvider', 'supabaseKey', null, v)} placeholder="eyJh..." />
                                </div>
                                
                                <button onClick={() => requestCloudChange('Supabase')} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                    حفظ وتفعيل الاتصال 🔗
                                </button>
                            </div>

                            {/* 2. إعدادات Google Sheets (النسخ الاحتياطي) */}
                            <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-xl font-black">📊</div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-sm">تصدير التقارير (Google Sheets)</h3>
                                            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">Analytics Backup</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <InputField label="Webhook URL (رابط اسكربت جوجل)" value={config.cloudProvider?.gsheetsWebhook || ''} onChange={v => updateNested('cloudProvider', 'gsheetsWebhook', null, v)} placeholder="https://script.google.com/macros/s/..." />
                                </div>

                                <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-[9px] font-bold text-blue-800 leading-relaxed">
                                        ⚙️ لاستخدام هذه الميزة، قم بإنشاء App Script في جوجل شيت يستقبل بيانات (POST)، ثم ضع الرابط هنا. سيقوم النظام بدفع ملخص الوردية والتقارير المالية تلقائياً إليه.
                                    </p>
                                </div>
                                
                                <button onClick={() => requestCloudChange('Google Sheets')} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                    حفظ إعدادات جوجل شيت 📝
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* 💻 تبويب المطور وسجل الأخطاء */}
                {activeTab === 'advanced' && currentUser?.role === 'OWNER' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
                            <h3 className="font-black text-red-800 text-sm mb-2 flex items-center gap-2"><span>⚠️</span> منطقة الخطر (Danger Zone)</h3>
                            <button onClick={() => { if(confirm("هل أنت متأكد من مسح كاش المتصفح بالكامل؟")) { localStorage.clear(); location.reload(); } }} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs shadow-md flex justify-center items-center gap-2">تفريغ الكاش 🗑️</button>
                        </div>
                    </div>
                )}

            </div>

            {/* 🛡️ نافذة الأمان (Security Modal) للتأكيد قبل تغيير المزامنة */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-slate-900 p-6 text-white text-center">
                            <span className="text-5xl block mb-2">🛡️</span>
                            <h3 className="font-black text-lg">تحذير أمان للبيانات</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">تغيير إعدادات {pendingSyncType}</p>
                        </div>
                        <div className="p-6 md:p-8 space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                <p className="text-[11px] font-black text-amber-900 leading-relaxed text-center">
                                    أنت على وشك تغيير وجهة قاعدة البيانات السحابية. لمنع فقدان أي فواتير أو أقساط مسجلة محلياً، سيقوم النظام الآن بإجبار المتصفح على عمل (مزامنة كاملة - Push) للسحابة الحالية قبل اعتماد الرابط الجديد.
                                </p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 text-center">هل توافق على المزامنة وتطبيق التغييرات؟</p>
                            
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowSecurityModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors">إلغاء الأمر</button>
                                <button onClick={confirmAndForceSync} disabled={isProcessing} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                                    {isProcessing ? <span className="animate-spin text-lg">🔄</span> : 'تأكيد ومزامنة ✔️'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- المكونات المساعدة ---
const InputField = ({ label, value, onChange, type = "text", placeholder="" }) => (
    <div className="group">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 pl-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
        <input 
            type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
        />
    </div>
);

const SaveButton = ({ onClick, label, isProcessing }) => (
    <button onClick={onClick} disabled={isProcessing} className="w-full md:w-auto mt-8 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all disabled:opacity-70 flex justify-center items-center gap-2">
        {isProcessing ? 'جاري الحفظ...' : label} 💾
    </button>
);

window.SettingsModule = SettingsModule;
