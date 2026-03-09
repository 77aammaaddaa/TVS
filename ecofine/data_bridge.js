// data_bridge.js - مديول استيراد وتصدير البيانات (إصدار إكس القابضة V6)

const ImportModule = () => {
    const [fileData, setFileData] = React.useState([]);
    const [headers, setHeaders] = React.useState([]);
    const [mapping, setMapping] = React.useState({});
    const [targetStore, setTargetStore] = React.useState('customers');
    const [step, setStep] = React.useState(1); // 1: رفع، 2: ربط، 3: معالجة

    // الحقول المطلوبة لكل جدول في القاعدة
    const storeFields = {
        'customers': ['full_name', 'national_id', 'phone', 'address', 'job'],
        'products': ['name', 'cost_price', 'wholesale_price', 'cash_price', 'installment_price', 'stock'],
        'suppliers': ['company_name', 'phone', 'contact_person']
    };

    // 1. قراءة ملف CSV
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').map(row => row.split(','));
            setHeaders(rows[0]); // أول صف هو العناوين
            setFileData(rows.slice(1)); // الباقي هو البيانات
            setStep(2);
        };
        reader.readAsText(file);
    };

    // 2. تنفيذ الاستيراد النهائي
    const executeImport = async () => {
        let successCount = 0;
        try {
            for (const row of fileData) {
                if (row.length < headers.length) continue;
                
                let record = {};
                storeFields[targetStore].forEach(field => {
                    const csvIndex = headers.indexOf(mapping[field]);
                    record[field] = row[csvIndex]?.trim();
                });

                await db.add(targetStore, record);
                successCount++;
            }
            alert(`✅ تم استيراد ${successCount} سجل بنجاح إلى ${targetStore}`);
            setStep(1);
        } catch (err) {
            alert("❌ فشل الاستيراد: تأكد من اختيار الأعمدة الصحيحة");
        }
    };

    // 3. تصدير البيانات (Backup)
    const exportToCSV = async (storeName) => {
        const data = await db.getAll(storeName);
        if (data.length === 0) return alert("المخزن فارغ!");

        const csvHeaders = Object.keys(data[0]).join(',');
        const csvRows = data.map(row => Object.values(row).join(',')).join('\n');
        const blob = new Blob([`\ufeff${csvHeaders}\n${csvRows}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `X_Holding_${storeName}_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 pb-20">
            {/* الجزء العلوي: التصدير (Backup) */}
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
                <h3 className="font-black mb-4 flex items-center gap-2">📤 تصدير البيانات (نسخة احتياطية)</h3>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {['customers', 'products', 'invoices', 'installments'].map(s => (
                        <button key={s} onClick={() => exportToCSV(s)} className="bg-slate-800 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 transition-colors whitespace-nowrap">
                            تصدير {s.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* الجزء السفلي: الاستيراد الذكي */}
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-6">
                <h3 className="font-black text-slate-800 flex items-center gap-2">📥 الاستيراد والتوافق (Mapping)</h3>

                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in">
                        <label className="block text-xs font-bold text-slate-400">1. اختر المخزن المستهدف</label>
                        <select className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={targetStore} onChange={e => setTargetStore(e.target.value)}>
                            <option value="customers">العملاء (CRM)</option>
                            <option value="products">الأصناف (Inventory)</option>
                            <option value="suppliers">الموردين (Suppliers)</option>
                        </select>
                        <div className="border-2 border-dashed border-slate-200 p-10 rounded-3xl text-center">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csvFile" />
                            <label htmlFor="csvFile" className="cursor-pointer">
                                <span className="text-4xl block mb-2">📁</span>
                                <span className="font-bold text-blue-600 underline">اضغط لرفع ملف CSV</span>
                                <p className="text-[10px] text-slate-400 mt-2">تأكد أن الملف بتنسيق CSV (Comma Separated)</p>
                            </label>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-left">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <h4 className="font-black text-blue-700 text-xs">2. ربط أعمدة الملف بحقول السيستم</h4>
                            <p className="text-[9px] text-blue-400 mt-1 italic">حدد كل حقل في السيستم يقابله إيه في ملفك</p>
                        </div>
                        
                        <div className="space-y-3">
                            {storeFields[targetStore].map(field => (
                                <div key={field} className="flex items-center gap-4">
                                    <span className="w-1/3 text-xs font-bold text-slate-600 uppercase">{field.replace('_', ' ')}</span>
                                    <select 
                                        className="flex-1 p-3 bg-slate-50 border rounded-xl text-xs font-black"
                                        onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                                    >
                                        <option value="">اختر العمود...</option>
                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-4">
                            <button onClick={executeImport} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black">بدء عملية المعالجة</button>
                            <button onClick={() => setStep(1)} className="px-6 bg-slate-100 rounded-2xl font-bold">إلغاء</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

window.ImportModule = ImportModule;
