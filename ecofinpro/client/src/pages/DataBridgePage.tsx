import { useState, useRef } from "react";
import { dataBridgeAPI } from "@/services/api";
import { UploadCloud, Download, Database, CheckCircle, AlertCircle, RefreshCw, X } from "lucide-react";

const storeFields: Record<string, { key: string, label: string }[]> = {
    'customers': [
        { key: 'full_name', label: 'اسم العميل' },
        { key: 'national_id', label: 'الرقم القومي' },
        { key: 'phone', label: 'رقم الهاتف' },
        { key: 'address', label: 'العنوان' },
        { key: 'monthly_income', label: 'الدخل الشهري' }
    ],
    'products': [
        { key: 'name', label: 'اسم المنتج' },
        { key: 'sku', label: 'الباركود / SKU' },
        { key: 'stock_quantity', label: 'الكمية' },
        { key: 'cost_price', label: 'سعر التكلفة' },
        { key: 'cash_price', label: 'سعر الكاش' },
        { key: 'installment_price', label: 'سعر القسط' }
    ],
    'suppliers': [
        { key: 'name', label: 'اسم المورد' },
        { key: 'phone', label: 'الهاتف' },
        { key: 'address', label: 'العنوان' }
    ]
};

const storeLabels: Record<string, string> = {
    'customers': 'العملاء (CRM)',
    'products': 'الأصناف (Inventory)',
    'suppliers': 'الموردين (Suppliers)'
};

export default function DataBridgePage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [targetStore, setTargetStore] = useState('customers');
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [result, setResult] = useState<{ inserted: number; duplicates_skipped: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [importedTables, setImportedTables] = useState<string[]>([]); // track already imported tables

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const allowedExtensions = ['csv', 'tsv', 'xlsx', 'xls'];
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!extension || !allowedExtensions.includes(extension)) {
            setErrorMsg("يرجى رفع ملف بصيغة CSV, TSV, XLSX, أو XLS فقط.");
            return;
        }

        setFile(selectedFile);
        setErrorMsg(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const firstLine = text.split(/\r?\n/)[0];
            if (firstLine) {
                const headers = firstLine.split(',').map(h => h.trim().replace(/(^"|"$)/g, ''));
                setCsvHeaders(headers);
                setStep(2);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleImportSubmit = async () => {
        if (!file) return;
        setIsProcessing(true);
        setErrorMsg(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('table', targetStore);
        formData.append('mapping', JSON.stringify(mapping));

        try {
            const res = await dataBridgeAPI.importData(formData);
            setResult({ inserted: res.data.inserted, duplicates_skipped: res.data.duplicates_skipped });
            // Mark table as imported locally (backend prevents re-import anyway)
            setImportedTables(prev => [...prev, targetStore]);
            setStep(3);
        } catch (error: any) {
            setErrorMsg(error.message || "حدث خطأ أثناء رفع البيانات.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExport = async (table: string) => {
        setIsExporting(table);
        setErrorMsg(null);
        try {
            const res = await dataBridgeAPI.exportData(table);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `EcoFin_${table}_Export.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (err: any) {
            setErrorMsg(err.message || "فشل تصدير البيانات. تأكد من وجود بيانات في هذا الجدول.");
        } finally {
            setIsExporting(null);
        }
    };

    const resetProcess = () => {
        setStep(1);
        setFile(null);
        setCsvHeaders([]);
        setMapping({});
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isTableImported = importedTables.includes(targetStore);

    return (
        <div className="max-w-5xl mx-auto space-y-6 font-sans animate-in fade-in duration-500 pb-20">
            
            {/* Header */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <Database className="w-8 h-8 text-blue-600" />
                    جسر البيانات المركزية
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-2">
                    إدارة الاستيراد والتصدير المجمع (Bulk Import/Export)
                </p>
            </div>

            {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3 font-semibold text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {errorMsg}
                    <button onClick={() => setErrorMsg(null)} className="mr-auto text-red-400 hover:text-red-700"><X className="w-4 h-4"/></button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* EXPORT SECTION */}
                <div className="lg:col-span-1 bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 h-max">
                    <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                        <Download className="w-5 h-5 text-emerald-400" /> تصدير نسخة احتياطية
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                        قم بتحميل جداول النظام كملفات CSV للمراجعة الخارجية.
                    </p>
                    
                    <div className="space-y-3">
                        {Object.keys(storeLabels).map(store => (
                            <button 
                                key={store} 
                                onClick={() => handleExport(store)}
                                disabled={isExporting === store}
                                className="w-full bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 p-4 rounded-xl text-sm font-bold transition-all flex items-center justify-between group"
                            >
                                <span>{storeLabels[store]}</span>
                                {isExporting === store ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Download className="w-4 h-4 text-slate-500 group-hover:text-white" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* IMPORT SECTION */}
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-6">
                        <UploadCloud className="w-6 h-6 text-blue-600" /> الاستيراد الذكي (Data Mapping)
                    </h3>

                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">1. اختر الجدول المستهدف</label>
                                <select 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-colors" 
                                    value={targetStore} 
                                    onChange={e => setTargetStore(e.target.value)}
                                >
                                    {Object.keys(storeLabels).map(key => (
                                        <option key={key} value={key}>{storeLabels[key]}</option>
                                    ))}
                                </select>
                                {isTableImported && (
                                    <p className="text-xs font-bold text-amber-600 mt-2">تم استيراد هذا الجدول مسبقاً ولا يمكن استيراده مرة أخرى.</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">2. ارفع ملف CSV</label>
                                <div 
                                    className={`border-2 border-dashed p-10 rounded-2xl text-center transition-all cursor-pointer relative group ${isTableImported ? 'border-slate-200 bg-slate-50 opacity-50 pointer-events-none' : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'}`}
                                    onClick={() => !isTableImported && fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        accept=".csv,.tsv,.xlsx,.xls"
                                        onChange={handleFileSelect} 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        disabled={isTableImported}
                                    />
                                    <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${isTableImported ? 'text-slate-300' : 'text-slate-400 group-hover:text-blue-500 group-hover:-translate-y-1'}`} />
                                    <span className="font-black text-slate-700 block">اسحب الملف هنا أو اضغط للاختيار</span>
                                    <p className="text-xs font-semibold text-slate-400 mt-2">يجب أن يحتوي الصف الأول على عناوين الأعمدة</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-left">
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                <h4 className="font-bold text-amber-800 text-sm mb-1">مطابقة الحقول (Mapping)</h4>
                                <p className="text-xs font-medium text-amber-700">اربط كل حقل في النظام (يمين) بالعمود المناسب من ملفك (يسار).</p>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2">
                                {storeFields[targetStore].map(field => (
                                    <div key={field.key} className="flex items-center gap-4 p-3 border-b border-slate-200 last:border-0">
                                        <div className="w-1/3">
                                            <span className="text-xs font-black text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm block w-max">
                                                {field.label}
                                            </span>
                                        </div>
                                        <select 
                                            className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-blue-500 transition-colors"
                                            value={mapping[field.key] || ''}
                                            onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                                        >
                                            <option value="">-- تجاهل --</option>
                                            {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={resetProcess} disabled={isProcessing} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm">
                                    إلغاء
                                </button>
                                <button onClick={handleImportSubmit} disabled={isProcessing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                                    {isProcessing ? <><RefreshCw className="w-4 h-4 animate-spin"/> جاري الرفع والمعالجة...</> : 'تأكيد الرفع والاستيراد'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && result && (
                        <div className="text-center space-y-6 py-8 animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">اكتملت المعالجة بنجاح</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-2">تم نقل البيانات إلى الخوادم السحابية.</p>
                            </div>
                            
                            <div className="flex justify-center gap-6 text-sm font-black">
                                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                                    <span className="text-emerald-600 text-2xl block mb-1">{result.inserted}</span>
                                    <span className="text-slate-500">سجل ناجح</span>
                                </div>
                                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                                    <span className="text-amber-500 text-2xl block mb-1">{result.duplicates_skipped}</span>
                                    <span className="text-slate-500">سجل مكرر تم تجاهله</span>
                                </div>
                            </div>

                            <button onClick={resetProcess} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm">
                                رفع ملف جديد
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}