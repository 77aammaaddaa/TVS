/**
 * 🌉 data_bridge.js - جسر استيراد وتصدير البيانات (Enterprise V11.5)
 * النظام: Eco Fine Pro | المطور: Techno Vision Solutions (Mr. X)
 * التحديث: التوافق الكامل مع المخطط السحابي (Schema)، استخراج آمن لملفات CSV، وتخصيص أسماء الملفات للمؤسسة.
 */

const { useState } = React;

const ImportModule = ({ orgConfig }) => {
    const [fileData, setFileData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [targetStore, setTargetStore] = useState('customers');
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [notification, setNotification] = useState(null);

    // 🌟 تم تحديث الحقول لتتطابق تماماً مع جداول Supabase (SQL Schema V11)
    const storeFields = {
        'customers': ['full_name', 'national_id', 'phone', 'whatsapp', 'province', 'area', 'address_details', 'job', 'monthly_income'],
        'products': ['name', 'barcode', 'stock', 'cost_price', 'cash_price', 'installment_price', 'min_stock'],
        'suppliers': ['name', 'phone', 'company']
    };

    const storeLabels = {
        'customers': 'العملاء (CRM)',
        'products': 'الأصناف (Inventory)',
        'suppliers': 'الموردين (Suppliers)'
    };

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // 1. قراءة وتحليل ملف CSV باحترافية
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            showNotification('⚠️ يرجى رفع ملف بصيغة CSV فقط.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            // معالجة السطور وتجاهل الفارغ منها
            const rows = text.split(/\r?\n/).map(row => row.split(',')).filter(row => row.length > 1);
            
            if (rows.length < 2) {
                showNotification('⚠️ الملف فارغ أو لا يحتوي على بيانات كافية.', 'error');
                return;
            }

            setHeaders(rows[0].map(h => h.trim().replace(/"/g, ''))); // العناوين بدون علامات تنصيص
            setFileData(rows.slice(1));
            setStep(2);
        };
        reader.readAsText(file);
    };

    // 2. تنفيذ الاستيراد النهائي عبر محرك X-Core الهجين
    const executeImport = async () => {
        setIsProcessing(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const row of fileData) {
                // تخطي الصفوف غير المكتملة
                if (row.length < headers.length / 2) continue; 
                
                let record = {};
                let isValidRecord = false;

                storeFields[targetStore].forEach(field => {
                    const csvIndex = headers.indexOf(mapping[field]);
                    if (csvIndex !== -1 && row[csvIndex]) {
                        // تنظيف الداتا من أي مسافات أو علامات تنصيص
                        let val = row[csvIndex].trim().replace(/"/g, '');
                        // تحويل الأرقام لنوعها الصحيح
                        if (['stock', 'cost_price', 'cash_price', 'installment_price', 'monthly_income', 'min_stock'].includes(field)) {
                            val = Number(val) || 0;
                        }
                        record[field] = val;
                        isValidRecord = true; // يوجد داتا واحدة على الأقل
                    }
                });

                if (isValidRecord) {
                    try {
                        // إضافة السجل (سيقوم db.add بحفظه محلياً ورفعه للسحابة تلقائياً)
                        await window.db.add(targetStore, record);
                        successCount++;
                    } catch (err) {
                        failCount++;
                    }
                }
            }
            
            showNotification(`✅ تمت العملية: نجاح (${successCount}) سجل، فشل (${failCount}).`);
            setStep(1);
            setMapping({});
        } catch (err) {
            showNotification("❌ فشل الاستيراد: حدث خطأ غير متوقع في معالجة البيانات.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. تصدير البيانات (Backup) ببصمة المؤسسة
    const exportToCSV = async (storeName) => {
        try {
            const data = await window.db.getAll(storeName);
            if (!data || data.length === 0) {
                showNotification(`⚠️ لا يوجد بيانات في جدول ${storeLabels[storeName]} لتصديرها.`, 'error');
                return;
            }

            // استخراج العناوين ديناميكياً بناءً على أول سجل
            const csvHeaders = Object.keys(data[0]).join(',');
            
            // معالجة الداتا لتجنب كسر ملف الـ CSV بسبب الفواصل داخل النصوص
            const csvRows = data.map(row => 
                Object.values(row).map(val => {
                    const safeVal = val === null || val === undefined ? '' : String(val).replace(/"/g, '""');
                    return `"${safeVal}"`;
                }).join(',')
            ).join('\n');

            const blob = new Blob([`\ufeff${csvHeaders}\n${csvRows}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            
            // تسمية الملف باسم المؤسسة والتاريخ
            const orgNameClean = (orgConfig?.orgName || 'X_Holding').replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            link.download = `EcoFine_${orgNameClean}_${storeName}_${dateStr}.csv`;
            
            link.click();
            showNotification(`✅ تم تحميل نسخة احتياطية من ${storeLabels[storeName]} بنجاح.`);
        } catch (err) {
            showNotification(`❌ فشل تصدير البيانات: ${err.message}`, 'error');
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in relative">
            
            {/* نظام الإشعارات العائم */}
            {notification && (
                <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-2xl shadow-2xl text-white font-black text-xs transition-all duration-300 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.msg}
                </div>
            )}

            {/* الهيدر التعريفي */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    <span className="text-3xl">💽</span> جسر البيانات المركزية
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                    نقل وتأمين بيانات مؤسسة: <span className="text-blue-600">{orgConfig?.orgName || 'النظام'}</span>
                </p>
            </div>

            {/* الجزء العلوي: التصدير (Backup) */}
            <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h3 className="font-black mb-4 flex items-center gap-2 text-sm md:text-base">
                        <span className="text-green-400">📥</span> تصدير البيانات (نسخة احتياطية سحابية)
                    </h3>
                    <p className="text-[10px] text-slate-400 mb-6 leading-relaxed">قم بتحميل نسخة Excel (CSV) من قواعد بياناتك الحالية للحفظ المادي أو المراجعة الخارجية.</p>
                    
                    <div className="flex flex-wrap gap-3">
                        {Object.keys(storeLabels).map(store => (
                            <button key={store} onClick={() => exportToCSV(store)} className="flex-1 min-w-[120px] bg-white/10 hover:bg-green-600 border border-white/10 px-4 py-3 rounded-2xl text-[10px] md:text-xs font-black transition-all whitespace-nowrap active:scale-95 flex items-center justify-center gap-2">
                                <span>📄</span> {storeLabels[store]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* الجزء السفلي: الاستيراد الذكي */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 relative">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm md:text-base">
                    <span className="text-blue-600">📤</span> الاستيراد والتوافق (Data Mapping)
                </h3>

                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
                            <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                                💡 قم برفع ملف الـ CSV الخاص بك لدمجه في قاعدة البيانات. النظام سيطلب منك مطابقة الأعمدة لتجنب أخطاء الإدخال.
                            </p>
                        </div>

                        <label className="block text-xs font-black text-slate-700 uppercase">1. اختر المخزن المستهدف للإضافة</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-blue-500 transition-colors" value={targetStore} onChange={e => setTargetStore(e.target.value)}>
                            {Object.keys(storeLabels).map(key => (
                                <option key={key} value={key}>{storeLabels[key]}</option>
                            ))}
                        </select>
                        
                        <div className="border-2 border-dashed border-slate-300 p-12 rounded-[2rem] text-center hover:bg-slate-50 transition-colors group cursor-pointer relative overflow-hidden mt-4">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="اضغط لرفع الملف" />
                            <div className="relative z-0">
                                <span className="text-5xl block mb-3 group-hover:-translate-y-2 transition-transform">📁</span>
                                <span className="font-black text-blue-600 text-sm md:text-base">اسحب الملف هنا أو اضغط للرفع</span>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">صيغة مدعومة: CSV فقط</p>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-left duration-300">
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                            <h4 className="font-black text-amber-800 text-sm mb-1">2. ربط أعمدة الملف بحقول النظام (Mapping)</h4>
                            <p className="text-[10px] font-bold text-amber-600 leading-relaxed">حدد كل حقل في النظام (يمين) ما يقابله من أعمدة في ملفك (يسار). اترك الحقل "فارغاً" إذا لم يكن متوفراً في ملفك.</p>
                        </div>
                        
                        <div className="space-y-3 bg-slate-50 p-4 md:p-6 rounded-[2rem] border border-slate-100">
                            {storeFields[targetStore].map(field => (
                                <div key={field} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-2 md:p-0 border-b border-slate-200 md:border-0 last:border-0 pb-4 md:pb-0">
                                    <span className="w-full md:w-1/3 text-[10px] md:text-xs font-black text-slate-600 uppercase tracking-wider bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                        {field.replace(/_/g, ' ')}
                                    </span>
                                    <div className="hidden md:block text-slate-300">⬅️</div>
                                    <select 
                                        className="flex-1 p-3 bg-white border border-slate-300 rounded-xl text-[10px] md:text-xs font-black outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                        onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                                    >
                                        <option value="">-- تجاهل هذا الحقل --</option>
                                        {headers.map((h, i) => <option key={i} value={h}>{h || `عمود مجهول ${i}`}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button 
                                onClick={executeImport} 
                                disabled={isProcessing}
                                className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isProcessing ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {isProcessing ? <><span className="animate-spin">⏳</span> جاري معالجة ورفع البيانات...</> : 'بدء عملية الدمج والاستيراد 🚀'}
                            </button>
                            <button onClick={() => {setStep(1); setMapping({}); setFileData([]);}} disabled={isProcessing} className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition-colors">إلغاء الأمر</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

window.ImportModule = ImportModule;
