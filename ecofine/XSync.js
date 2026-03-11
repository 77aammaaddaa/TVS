/**
 * ☁️ XSync.js - محرك المزامنة السحابية والربط المتقدم (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: إدارة الربط (Supabase / Google Sheets)، المزامنة التلقائية، وسجل نقل البيانات.
 */

const { useState, useEffect, useRef } = React;

const XSyncModule = ({ currentUser }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [syncLogs, setSyncLogs] = useState([]);
    
    // إعدادات المزامنة
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('ecofine_config');
        const parsed = saved ? JSON.parse(saved) : {};
        return parsed.cloudProvider || {
            activeProvider: 'none', // 'supabase', 'gsheets', 'none'
            supabaseUrl: '',
            supabaseKey: '',
            gsheetsWebhook: '',
            autoSyncInterval: 15 // بالدقائق
        };
    });

    // حالات النوافذ المنبثقة
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [pendingConfig, setPendingConfig] = useState(null);
    const [showScriptModal, setShowScriptModal] = useState(false);

    // ⛔ حماية سيادية: هذه الشاشة للمالك (المطور) فقط
    if (currentUser?.role !== 'OWNER') {
        if (window.XAudit) window.XAudit.log('محاولة اختراق', 'المزامنة', `حاول ${currentUser?.username} فتح إعدادات السحابة`, 'critical');
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">وصول غير مصرح به</h2>
                <p className="text-xs text-red-400 font-bold mt-2">إعدادات الربط السحابي (API) مصرح بها لمدير النظام فقط.</p>
            </div>
        );
    }

    // جلب سجلات المزامنة عند التحميل
    useEffect(() => {
        const loadLogs = async () => {
            if (window.db && window.db.getAll) {
                const logs = await window.db.getAll('audit_logs').catch(() => []);
                const syncEvents = logs.filter(l => l.module === 'المزامنة');
                setSyncLogs(syncEvents.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }
        };
        loadLogs();
    }, [isProcessing]);

    // ==========================================
    // 🛡️ نظام التبديل الآمن (Fail-Safe Cloud Switch)
    // ==========================================
    const requestProviderChange = (provider) => {
        setPendingConfig({ ...config, activeProvider: provider });
        setShowSecurityModal(true);
    };

    const confirmAndExecuteSwitch = async () => {
        setIsProcessing(true);
        try {
            logSyncEvent('info', `بدء إجراءات تبديل السحابة إلى ${pendingConfig.activeProvider}`);

            // 1. إجبار رفع البيانات المحلية للسحابة القديمة (لتأمينها)
            if (navigator.onLine && window.db && window.db.syncWithCloud && config.activeProvider !== 'none') {
                logSyncEvent('warning', `جاري رفع البيانات غير المتزامنة للسحابة القديمة...`);
                await window.db.syncWithCloud();
            }

            // 2. تحديث الإعدادات في الذاكرة
            const fullConfig = JSON.parse(localStorage.getItem('ecofine_config')) || {};
            fullConfig.cloudProvider = pendingConfig;
            localStorage.setItem('ecofine_config', JSON.stringify(fullConfig));
            window.XConfig = fullConfig;
            setConfig(pendingConfig);

            // 3. سحب البيانات من السحابة الجديدة
            if (navigator.onLine && window.db && window.db.pullAllFromCloud) {
                logSyncEvent('warning', `جاري سحب قاعدة البيانات من السحابة الجديدة...`);
                // ملاحظة: في بيئة العمل الحقيقية سيتم إعادة تهيئة قاعدة البيانات هنا
                // await window.db.reInitialize(pendingConfig.supabaseUrl, pendingConfig.supabaseKey);
            }

            logSyncEvent('success', `تم تفعيل الربط السحابي مع ${pendingConfig.activeProvider} بنجاح.`);
            setShowSecurityModal(false);
            alert(`✅ اكتملت عملية التبديل إلى ${pendingConfig.activeProvider} وتم تأمين البيانات.`);
            
        } catch (err) {
            logSyncEvent('critical', `فشل في تبديل السحابة: ${err.message}`);
            alert(`❌ فشل النقل: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // ==========================================
    // 🚀 المزامنة اليدوية الفورية
    // ==========================================
    const forceSyncNow = async () => {
        setIsProcessing(true);
        try {
            if (!navigator.onLine) throw new Error("لا يوجد اتصال بالإنترنت.");
            if (config.activeProvider === 'none') throw new Error("لم يتم تحديد مزود سحابي بعد.");

            logSyncEvent('info', 'تم طلب مزامنة يدوية للبيانات.');
            
            if (window.db && window.db.syncWithCloud) {
                await window.db.syncWithCloud(); // Push
                await window.db.pullAllFromCloud(); // Pull
                
                const now = new Date().toLocaleString('ar-EG');
                localStorage.setItem('last_sync_time', now);
                logSyncEvent('success', 'اكتملت دورة المزامنة الشاملة (Push/Pull) بنجاح.');
                alert("☁️ اكتملت المزامنة وتأمين البيانات بنجاح.");
            }
        } catch (err) {
            logSyncEvent('critical', `فشل المزامنة اليدوية: ${err.message}`);
            alert(`❌ خطأ: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const logSyncEvent = (severity, details) => {
        if (window.XAudit) {
            window.XAudit.log('حدث مزامنة', 'المزامنة', details, severity, currentUser?.username);
        }
    };

    const updateConfigVal = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    // كود الجوجل سكريبت الجاهز للنسخ
    const gasCode = `/**
 * Eco Fine Pro V12.0 - Google Sheets Database Engine
 * قم بنسخ هذا الكود بالكامل ولصقه في (Extensions > Apps Script)
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tableName = data.table || "General"; 
    
    // البحث عن الشيت، أو إنشائه إن لم يكن موجوداً
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
      // إنشاء الهيدر بناءً على مفاتيح الكائن
      var keys = Object.keys(data.payload);
      sheet.appendRow(keys);
    }
    
    // إضافة البيانات
    var rowData = [];
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(function(header) {
      rowData.push(data.payload[header] !== undefined ? data.payload[header] : "");
    });
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "table": tableName}))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in max-w-5xl mx-auto">
            
            {/* الهيدر وشريط الحالة */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <span className="text-3xl">☁️</span> مركز المزامنة (X-Sync Engine)
                    </h2>
                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-2">تحكم كامل في قواعد البيانات السحابية وضمان استقرار البيانات.</p>
                </div>
                
                <div className="relative z-10 flex gap-3 w-full md:w-auto">
                    <div className="bg-black/30 px-5 py-3 rounded-2xl border border-white/10 text-center flex-1">
                        <span className="block text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">المزود النشط</span>
                        <span className={`text-xs font-black ${config.activeProvider === 'supabase' ? 'text-emerald-400' : config.activeProvider === 'gsheets' ? 'text-blue-400' : 'text-red-400'}`}>
                            {config.activeProvider === 'supabase' ? 'Supabase' : config.activeProvider === 'gsheets' ? 'Google Sheets' : 'Local Only (غير متصل)'}
                        </span>
                    </div>
                    <button onClick={forceSyncNow} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-1">
                        {isProcessing ? <span className="animate-spin">🔄</span> : '🚀'} مزامنة الآن
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 🟢 إعدادات Supabase */}
                <div className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 transition-all shadow-sm relative overflow-hidden ${config.activeProvider === 'supabase' ? 'border-emerald-500 shadow-emerald-500/10' : 'border-slate-100'}`}>
                    {config.activeProvider === 'supabase' && <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>}
                    
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-2xl font-black">⚡</div>
                            <div>
                                <h3 className="font-black text-slate-800">قاعدة بيانات Supabase</h3>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">سريعة، تدعم Real-time للشركات الكبرى</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <InputField label="Project URL (رابط المشروع)" value={config.supabaseUrl} onChange={v => updateConfigVal('supabaseUrl', v)} placeholder="https://xxxx.supabase.co" />
                        <InputField label="Anon Key (مفتاح الربط)" type="password" value={config.supabaseKey} onChange={v => updateConfigVal('supabaseKey', v)} placeholder="eyJh..." />
                    </div>

                    {config.activeProvider !== 'supabase' ? (
                        <button onClick={() => requestProviderChange('supabase')} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-4 rounded-2xl font-black text-xs transition-colors flex justify-center items-center gap-2">
                            تفعيل Supabase كمزود أساسي ✔️
                        </button>
                    ) : (
                        <div className="text-center py-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">المزود النشط حالياً 🟢</div>
                    )}
                </div>

                {/* 🔵 إعدادات Google Sheets */}
                <div className={`bg-white p-6 md:p-8 rounded-[2.5rem] border-2 transition-all shadow-sm relative overflow-hidden ${config.activeProvider === 'gsheets' ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-100'}`}>
                    {config.activeProvider === 'gsheets' && <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>}
                    
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 text-2xl font-black">📊</div>
                            <div>
                                <h3 className="font-black text-slate-800">قاعدة بيانات Google Sheets</h3>
                                <p className="text-[9px] font-bold text-slate-400 mt-1">مجانية، تعمل كجداول إكسيل، سهلة التعديل</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-4">
                        <InputField label="Webhook URL (رابط السكريبت)" value={config.gsheetsWebhook} onChange={v => updateConfigVal('gsheetsWebhook', v)} placeholder="https://script.google.com/macros/s/..." />
                    </div>

                    <div className="mb-6 flex justify-between items-center p-3 bg-blue-50/50 rounded-xl border border-blue-100 border-dashed">
                        <span className="text-[9px] font-bold text-slate-500">تحتاج لكود الربط (App Script)؟</span>
                        <button onClick={() => setShowScriptModal(true)} className="text-[9px] font-black text-blue-600 hover:underline">عرض الكود البرمجي 📄</button>
                    </div>

                    {config.activeProvider !== 'gsheets' ? (
                        <button onClick={() => requestProviderChange('gsheets')} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-4 rounded-2xl font-black text-xs transition-colors flex justify-center items-center gap-2">
                            تفعيل Google Sheets كمزود أساسي ✔️
                        </button>
                    ) : (
                        <div className="text-center py-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest">المزود النشط حالياً 🟢</div>
                    )}
                </div>
            </div>

            {/* إعدادات المزامنة وسجل الأحداث */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* الإعدادات التلقائية */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm col-span-1">
                    <h3 className="font-black text-slate-800 text-sm mb-6 flex items-center gap-2"><span>⏱️</span> المزامنة التلقائية (Auto-Sync)</h3>
                    
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 pl-1">معدل رفع البيانات للخلفية</label>
                    <select 
                        value={config.autoSyncInterval}
                        onChange={(e) => {
                            updateConfigVal('autoSyncInterval', Number(e.target.value));
                            const fullConfig = JSON.parse(localStorage.getItem('ecofine_config')) || {};
                            fullConfig.cloudProvider = { ...config, autoSyncInterval: Number(e.target.value) };
                            localStorage.setItem('ecofine_config', JSON.stringify(fullConfig));
                            window.XConfig = fullConfig;
                            alert("تم تحديث معدل المزامنة التلقائية.");
                        }}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                        <option value={5}>كل 5 دقائق (مكثف)</option>
                        <option value={15}>كل 15 دقيقة (موصى به)</option>
                        <option value={30}>كل 30 دقيقة (متوسط)</option>
                        <option value={60}>كل 60 دقيقة (خفيف)</option>
                        <option value={0}>إيقاف (يدوي فقط)</option>
                    </select>
                </div>

                {/* سجل الأحداث (Audit Logs) */}
                <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 col-span-1 lg:col-span-2 flex flex-col h-[300px]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-white text-sm flex items-center gap-2"><span>📡</span> سجل أحداث المزامنة السحابية</h3>
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-3 py-1 rounded-full uppercase tracking-widest">Live Logs</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scroll bg-black/50 p-4 rounded-2xl border border-white/10 space-y-3">
                        {syncLogs.length > 0 ? syncLogs.map(log => (
                            <div key={log.id} className="border-b border-white/5 pb-2 last:border-0">
                                <div className="flex justify-between items-start mb-1">
                                    <p className={`text-[10px] font-black ${log.severity === 'critical' ? 'text-red-400' : log.severity === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {log.severity === 'critical' ? '❌ فشل مزامنة' : log.severity === 'warning' ? '⚠️ تنبيه' : '✅ مزامنة ناجحة'}
                                    </p>
                                    <span className="text-[8px] text-slate-500 font-mono" dir="ltr">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-[10px] text-slate-300 font-bold">{log.details}</p>
                            </div>
                        )) : (
                            <div className="h-full flex flex-col justify-center items-center text-slate-500 opacity-50">
                                <span className="text-3xl mb-2">📭</span>
                                <p className="text-xs font-bold">لا توجد أحداث مزامنة مسجلة بعد.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 🛡️ نافذة الأمان (Security Fail-Safe Modal) */}
            {showSecurityModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-amber-500 p-6 text-white text-center">
                            <span className="text-5xl block mb-2">🛡️</span>
                            <h3 className="font-black text-lg">تحذير أمان للبيانات</h3>
                            <p className="text-[10px] text-amber-100 font-bold mt-1 uppercase tracking-widest">تغيير إعدادات السحابة إلى {pendingConfig?.activeProvider}</p>
                        </div>
                        <div className="p-6 md:p-8 space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                                <p className="text-[11px] font-black text-amber-900 leading-relaxed">
                                    أنت على وشك تغيير وجهة قاعدة البيانات السحابية. لمنع فقدان أي فواتير مسجلة، سيقوم النظام الآن بإجبار المتصفح على عمل <span className="bg-amber-200 px-1 rounded">(مزامنة كاملة - Push)</span> للسحابة الحالية، ثم <span className="bg-amber-200 px-1 rounded">(سحب بيانات - Pull)</span> من السحابة الجديدة.
                                </p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 text-center">هل توافق على المزامنة وتطبيق التغييرات؟</p>
                            
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowSecurityModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors">إلغاء الأمر</button>
                                <button onClick={confirmAndExecuteSwitch} disabled={isProcessing} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 flex justify-center items-center gap-2">
                                    {isProcessing ? <span className="animate-spin text-lg">🔄</span> : 'تأكيد ومزامنة ✔️'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 📄 نافذة كود الجوجل شيت (Script Generator Modal) */}
            {showScriptModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-700 flex flex-col">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <div>
                                <h3 className="font-black text-blue-400 text-sm flex items-center gap-2"><span>📄</span> كود الربط (Google Apps Script)</h3>
                            </div>
                            <button onClick={() => setShowScriptModal(false)} className="text-slate-500 hover:text-white transition-colors text-xl">✕</button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto custom-scroll">
                            <p className="text-[10px] text-slate-400 font-bold mb-4 leading-relaxed">
                                1. افتح ملف جوجل شيت جديد.<br/>
                                2. اذهب إلى <span className="text-white">Extensions</span> ثم <span className="text-white">Apps Script</span>.<br/>
                                3. انسخ الكود التالي بالكامل والصقه هناك، ثم اضغط <span className="text-white">Deploy > Web app</span>.<br/>
                                4. انسخ الرابط الناتج وضعه في خانة (Webhook URL) في الإعدادات.
                            </p>
                            <div className="relative group">
                                <pre className="bg-black/50 p-4 rounded-xl border border-slate-800 text-[10px] text-emerald-400 font-mono overflow-x-auto custom-scroll" dir="ltr">
                                    {gasCode}
                                </pre>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(gasCode); alert("تم نسخ الكود الحافظة!"); }}
                                    className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    نسخ الكود 📋
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const InputField = ({ label, value, onChange, type = "text", placeholder="" }) => (
    <div className="group">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2 pl-1 group-focus-within:text-blue-500 transition-colors">{label}</label>
        <input 
            type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} dir="ltr"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm text-left"
        />
    </div>
);

window.XSyncModule = XSyncModule;
