// survey.js - مديول الاستعلام الميداني والتقييم (V6)

const SurveyModule = () => {
    const [customers, setCustomers] = React.useState([]);
    const [surveys, setSurveys] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        customer_id: '',
        visit_type: 'منزل',
        status: 'recommend', // recommend, reject, pending
        notes: '',
        surveyor_name: 'إكس'
    });

    const loadData = async () => {
        const [c, s] = await Promise.all([db.getAll('customers'), db.getAll('surveys')]);
        setCustomers(c || []);
        setSurveys(s || []);
    };

    React.useEffect(() => { loadData(); }, []);

    const handleSaveSurvey = async (e) => {
        e.preventDefault();
        try {
            // 1. تسجيل نتيجة الاستعلام
            await db.add('surveys', { ...formData, date: new Date().toISOString() });

            // 2. تحديث الـ Credit Score للعميل بناءً على القرار
            const scoreImpact = formData.status === 'recommend' ? 85 : (formData.status === 'reject' ? 20 : 50);
            await db.update('customers', formData.customer_id, { credit_score: scoreImpact });

            alert("✅ تم تسجيل الاستعلام وتحديث تقييم العميل آلياً");
            setIsModalOpen(false);
            setFormData({ customer_id: '', visit_type: 'منزل', status: 'recommend', notes: '', surveyor_name: 'إكس' });
            loadData();
        } catch (err) { alert("❌ خطأ في الحفظ"); }
    };

    const getCustName = (id) => customers.find(c => c.id === id)?.full_name || "عميل محذوف";

    return (
        <div className="space-y-6 pb-20">
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex justify-between items-center">
                <h3 className="font-black text-slate-800">تقارير الاستعلام</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-black text-xs">
                    + استعلام جديد
                </button>
            </div>

            <div className="space-y-4">
                {surveys.sort((a,b) => new Date(b.date) - new Date(a.date)).map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black text-white ${s.status === 'recommend' ? 'bg-green-600' : 'bg-red-600'}`}>
                            {s.status === 'recommend' ? 'تم التوصية' : 'مرفوض ائتمانياً'}
                        </div>
                        <h4 className="font-black text-slate-800 mb-1">{getCustName(s.customer_id)}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest">نوع المعاينة: {s.visit_type}</p>
                        <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-600 italic border border-slate-100">
                            " {s.notes} "
                        </div>
                    </div>
                ))}
            </div>

            {/* مودال الاستعلام */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveSurvey} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="font-black text-xl">نموذج معاينة ميدانية</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-2xl">✕</button>
                        </div>
                        
                        <div className="space-y-4 text-right">
                            <div>
                                <label className="text-[10px] font-black text-slate-400">العميل المستهدف</label>
                                <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.customer_id} onChange={e => setFormData({...formData, customer_id: e.target.value})}>
                                    <option value="">اختر العميل المعاين...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">مكان المعاينة</label>
                                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.visit_type} onChange={e => setFormData({...formData, visit_type: e.target.value})}>
                                        <option value="منزل">مقر السكن</option>
                                        <option value="عمل">مقر العمل</option>
                                        <option value="ضامن">سكن الضامن</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">القرار المبدئي</label>
                                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                        <option value="recommend">مقبول (Recommend)</option>
                                        <option value="reject">مرفوض (Reject)</option>
                                        <option value="pending">معلق للمراجعة</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400">تقرير المعاينة بالتفصيل</label>
                                <textarea rows="3" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" placeholder="اكتب ملاحظاتك عن السكن، الجيران، الجدية..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4">اعتماد التقرير وتحديث التقييم</button>
                    </form>
                </div>
            )}
        </div>
    );
};

window.SurveyModule = SurveyModule;
