// crm.js - مديول إدارة العملاء والتقييم الائتماني
// يحتوي على: تسجيل المشتري/الضامن، حساب التقييم المبدئي، والتحقق من البيانات

const CRMModule = () => {
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        national_id: '',
        phone: '',
        address: '',
        job: '',
        income_source: '',
        type: 'مشتري' // أو ضامن
    });

    // 1. تحميل البيانات عند الفتح
    const loadCustomers = async () => {
        const data = await db.getAll('customers');
        setCustomers(data);
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    // 2. حفظ العميل الجديد بقاعدة الـ 50%
    const handleSave = async (e) => {
        e.preventDefault();
        
        // التحقق من صحة البيانات (رقم قومي 14 رقم)
        if (formData.national_id.length !== 14) {
            alert("⚠️ الرقم القومي يجب أن يكون 14 رقماً");
            return;
        }

        try {
            await db.add('customers', {
                ...formData,
                status: 'نشط',
                credit_score: 50, // القيمة المبدئية المتفق عليها
                total_deals: 0,
                last_interaction: new Date().toISOString()
            });
            setIsModalOpen(false);
            setFormData({ full_name: '', national_id: '', phone: '', address: '', job: '', income_source: '', type: 'مشتري' });
            loadCustomers();
            alert("✅ تم تسجيل العميل بنجاح ويبدأ بتقييم 50%");
        } catch (err) {
            alert("❌ خطأ: الرقم القومي مسجل مسبقاً");
        }
    };

    // 3. تصفية البحث
    const filteredCustomers = customers.filter(c => 
        c.full_name.includes(searchTerm) || c.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* بار البحث والإضافة */}
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative w-1/3">
                    <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">🔍</span>
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم أو الهاتف..." 
                        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                    <span>➕</span> إضافة عميل / ضامن
                </button>
            </div>

            {/* جدول العملاء */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-4 font-bold text-slate-600">العميل</th>
                            <th className="p-4 font-bold text-slate-600">الهاتف</th>
                            <th className="p-4 font-bold text-slate-600">التقييم الائتماني</th>
                            <th className="p-4 font-bold text-slate-600">الحالة</th>
                            <th className="p-4 font-bold text-slate-600">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{c.full_name}</div>
                                    <div className="text-xs text-slate-400">{c.national_id}</div>
                                </td>
                                <td className="p-4 font-bold text-slate-600">{c.phone}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${c.credit_score >= 50 ? 'bg-green-500' : 'bg-red-500'}`} 
                                                style={{ width: `${c.credit_score}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-black">{c.credit_score}%</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">{c.status}</span>
                                </td>
                                <td className="p-4">
                                    <button className="text-slate-400 hover:text-blue-600">⚙️ تعديل</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* مودال الإضافة */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-slate-800">تسجيل بيانات عميل جديد</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl">×</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الرباعي</label>
                                    <input required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الرقم القومي</label>
                                    <input required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف</label>
                                    <input required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-1">العنوان بالتفصيل</label>
                                    <input required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg shadow-blue-200">حفظ وتقييم</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// جعل المديول متاحاً لـ app.js
window.CRMModule = CRMModule;
