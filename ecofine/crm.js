// crm.js - مديول إدارة العملاء المطور (إصدار الاستعلام الشامل V4)

const CRMModule = () => {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        full_name: '', national_id: '', phone: '', whatsapp: '',
        comm_method: 'whatsapp', province: '', area: '', address_details: '',
        job: '', marital_status: 'متزوج', qualification: '',
        monthly_income: '', income_source: '', housing_type: 'إيجار'
    });

    const loadCustomers = async () => {
        const data = await db.getAll('customers');
        setCustomers(data);
    };

    useEffect(() => { loadCustomers(); }, []);

    // دالة التحقق من البيانات
    const validateData = () => {
        const niRegex = /^\d{14}$/; // 14 رقم بالتمام
        const phoneRegex = /^01[0125][0-9]{8}$/; // أرقام شبكات مصر

        if (!niRegex.test(formData.national_id)) return "الرقم القومي يجب أن يكون 14 رقماً صحيحاً.";
        if (!phoneRegex.test(formData.phone)) return "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 010/011/012/015).";
        if (formData.whatsapp && !phoneRegex.test(formData.whatsapp)) return "رقم الواتساب غير صحيح.";
        if (Number(formData.monthly_income) <= 0) return "برجاء إدخال متوسط دخل شهري صحيح.";
        return null;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const error = validateData();
        if (error) {
            alert("⚠️ " + error);
            return;
        }

        try {
            await db.add('customers', {
                ...formData,
                status: 'نشط',
                credit_score: 50, // التقييم المبدئي
                last_update: new Date().toISOString()
            });
            setIsModalOpen(false);
            setFormData({
                full_name: '', national_id: '', phone: '', whatsapp: '',
                comm_method: 'whatsapp', province: '', area: '', address_details: '',
                job: '', marital_status: 'متزوج', qualification: '',
                monthly_income: '', income_source: '', housing_type: 'إيجار'
            });
            loadCustomers();
            alert("✅ تم تسجيل العميل وبدء ملف الاستعلام بنجاح.");
        } catch (err) {
            alert("❌ هذا الرقم القومي مسجل مسبقاً في النظام.");
        }
    };

    return (
        <div className="space-y-6">
            {/* بار البحث والإضافة */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <input 
                    type="text" placeholder="ابحث بالاسم أو الهاتف..." 
                    className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black flex items-center justify-center gap-2"
                >
                    <span>➕</span> تسجيل عميل جديد
                </button>
            </div>

            {/* عرض العملاء (بطاقات للموبايل) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.filter(c => c.full_name.includes(searchTerm)).map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                        <h4 className="font-black text-slate-800 mb-1">{c.full_name}</h4>
                        <p className="text-xs text-slate-400 mb-3">🆔 {c.national_id}</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">الهاتف:</span>
                                <span className="font-bold">{c.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">التقييم:</span>
                                <span className="font-black text-blue-600">{c.credit_score}%</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <span className="text-slate-400">السكن:</span>
                                <span>{c.province} - {c.area}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* مودال التسجيل الشامل */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] md:h-auto overflow-hidden flex flex-col animate-slide-up">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="text-xl font-black text-slate-800">بيانات الاستعلام الكاملة</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-400">×</button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scroll text-right">
                            
                            {/* القسم 1: البيانات الشخصية */}
                            <section>
                                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">1. البيانات الشخصية والقومية</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500">الاسم الرباعي (من واقع البطاقة)</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">الرقم القومي (14 رقم)</label>
                                        <input required type="number" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">الحالة الاجتماعية</label>
                                        <select className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})}>
                                            <option>أعزب</option><option>متزوج</option><option>مطلق</option><option>أرمل</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500">المؤهل الدراسي</label>
                                        <input className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            {/* القسم 2: التواصل والعنوان */}
                            <section>
                                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">2. التواصل والعنوان بالتفصيل</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">رقم الهاتف الأساسي</label>
                                        <input required type="tel" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">رقم الواتساب</label>
                                        <input type="tel" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">المحافظة</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">المنطقة / الحي / القرية</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500">تفاصيل العنوان (شارع - رقم منزل - علامة مميزة)</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.address_details} onChange={e => setFormData({...formData, address_details: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">نوع السكن</label>
                                        <select className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.housing_type} onChange={e => setFormData({...formData, housing_type: e.target.value})}>
                                            <option>تمليك</option><option>إيجار</option><option>سكن عائلي</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* القسم 3: الدخل والعمل */}
                            <section>
                                <h5 className="text-blue-600 font-black mb-4 border-b pb-2 text-sm">3. الوظيفة ومستوى الدخل</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">الوظيفة / المهنة</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">مصدر الدخل</label>
                                        <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.income_source} onChange={e => setFormData({...formData, income_source: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500">متوسط الدخل الشهري (ج.م)</label>
                                        <input required type="number" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl font-black text-blue-600" value={formData.monthly_income} onChange={e => setFormData({...formData, monthly_income: e.target.value})} />
                                    </div>
                                </div>
                            </section>

                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 sticky bottom-0">إتمام التسجيل والتقييم المبدئي</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

window.CRMModule = CRMModule;
