// legal.js - مديول الشؤون القانونية (إصدار الحزم V6)

const LegalModule = () => {
    const [cases, setCases] = React.useState([]);
    const [customers, setCustomers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        customer_id: '',
        case_number: '',
        case_type: 'جنحة تبديد', // جنحة، مدني، محضر شرطة
        status: 'open', // open, in_court, closed
        lawyer_name: '',
        next_session: '',
        notes: ''
    });

    const loadData = async () => {
        const [c, l] = await Promise.all([db.getAll('customers'), db.getAll('legal_cases')]);
        setCustomers(c || []);
        setCases(l || []);
    };

    React.useEffect(() => { loadData(); }, []);

    const handleSaveCase = async (e) => {
        e.preventDefault();
        try {
            // 1. تسجيل القضية
            await db.add('legal_cases', { ...formData });

            // 2. تحديث حالة العميل لـ "قانوني" وتصفير تقييمه الائتماني
            await db.update('customers', formData.customer_id, { 
                status: 'legal_action', 
                credit_score: 0 
            });

            alert("⚖️ تم رفع الملف للمجال القانوني وتجميد حساب العميل");
            setIsModalOpen(false);
            setFormData({ customer_id: '', case_number: '', case_type: 'جنحة تبديد', status: 'open', lawyer_name: '', next_session: '', notes: '' });
            loadData();
        } catch (err) { alert("❌ خطأ في الإجراء القانوني"); }
    };

    const getCust = (id) => customers.find(c => c.id === id) || {};

    return (
        <div className="space-y-6 pb-20">
            {/* الهيدر */}
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-800">الدائرة القانونية</h3>
                    <p className="text-[10px] text-red-500 font-bold uppercase">إدارة النزاعات والمحاضر</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-red-600 text-white px-6 py-2 rounded-2xl font-black text-xs shadow-lg shadow-red-100">
                    + فتح قضية
                </button>
            </div>

            {/* قائمة القضايا */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cases.map(caseItem => (
                    <div key={caseItem.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-2 h-full ${caseItem.status === 'open' ? 'bg-orange-500' : 'bg-red-600'}`}></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-slate-800">{getCust(caseItem.customer_id).full_name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold">رقم القضية: {caseItem.case_number}</p>
                            </div>
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-600 uppercase">
                                {caseItem.case_type}
                            </span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">المحامي:</span>
                                <span className="font-bold">{caseItem.lawyer_name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">الجلسة القادمة:</span>
                                <span className="font-black text-red-600">{caseItem.next_session || 'لم تحدد'}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-red-50 rounded-2xl text-[10px] text-red-700 italic border border-red-100">
                            " {caseItem.notes} "
                        </div>
                    </div>
                ))}
            </div>

            {/* مودال إضافة قضية */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveCase} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="font-black text-xl text-red-600 border-b pb-4">إحالة للمسائلة القانونية</h3>
                        
                        <div className="space-y-4">
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                                <option value="">اختر العميل المتعثر...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="رقم القضية / المحضر" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.case_number} onChange={e => setFormData({...formData, case_number: e.target.value})} />
                                <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.case_type} onChange={e => setFormData({...formData, case_type: e.target.value})}>
                                    <option value="جنحة تبديد">جنحة تبديد</option>
                                    <option value="شيك بدون رصيد">شيك بدون رصيد</option>
                                    <option value="أمر أداء">أمر أداء</option>
                                    <option value="محضر إثبات حالة">محضر إثبات حالة</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="اسم المحامي المتابع" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.lawyer_name} onChange={e => setFormData({...formData, lawyer_name: e.target.value})} />
                                <input type="date" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.next_session} onChange={e => setFormData({...formData, next_session: e.target.value})} />
                            </div>

                            <textarea rows="3" placeholder="ملاحظات قانونية إضافية..." className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>

                        <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-xl mt-4">اعتماد فتح ملف قضائي</button>
                    </form>
                </div>
            )}
        </div>
    );
};

window.LegalModule = LegalModule;
