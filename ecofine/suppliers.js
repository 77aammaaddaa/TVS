// suppliers.js - مديول إدارة الموردين (إصدار V6)

const SuppliersModule = () => {
    const [suppliers, setSuppliers] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [formData, setFormData] = React.useState({
        company_name: '',
        contact_person: '',
        phone: '',
        address: '',
        category: 'عام'
    });

    const loadSuppliers = async () => {
        const data = await db.getAll('suppliers');
        setSuppliers(data || []);
    };

    React.useEffect(() => { loadSuppliers(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await db.update('suppliers', formData.id, formData);
                alert("✅ تم تحديث بيانات المورد");
            } else {
                await db.add('suppliers', formData);
                alert("✅ تم إضافة المورد بنجاح");
            }
            setIsModalOpen(false);
            setFormData({ company_name: '', contact_person: '', phone: '', address: '', category: 'عام' });
            loadSuppliers();
        } catch (err) {
            alert("❌ خطأ في الحفظ");
        }
    };

    const deleteSupplier = async (id) => {
        if (confirm("⚠️ هل تريد حذف هذا المورد؟")) {
            await db.delete('suppliers', id);
            loadSuppliers();
        }
    };

    return (
        <div className="space-y-6">
            {/* رأس الصفحة والبحث */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <input 
                    type="text" placeholder="ابحث عن مورد..." 
                    className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => { setEditMode(false); setIsModalOpen(true); }}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-2xl font-black flex items-center justify-center gap-2"
                >
                    <span>🏢</span> إضافة مورد جديد
                </button>
            </div>

            {/* قائمة الموردين */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.filter(s => s.company_name.includes(searchTerm)).map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-black text-slate-800">{s.company_name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{s.category}</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setEditMode(true); setFormData(s); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">✏️</button>
                                <button onClick={() => deleteSupplier(s.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors">🗑️</button>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm border-t pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-400">المسؤول:</span>
                                <span className="font-bold">{s.contact_person}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">الهاتف:</span>
                                <span className="font-bold">{s.phone}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* نافذة الإضافة والتعديل */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSave} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="text-xl font-black text-slate-800">{editMode ? 'تعديل المورد' : 'إضافة مورد'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-2xl text-slate-400">✕</button>
                        </div>
                        <div className="space-y-4">
                            <input placeholder="اسم الشركة / المورد" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="اسم الشخص المسؤول" className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                                <input placeholder="رقم الهاتف" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <input placeholder="العنوان" className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4">حفظ بيانات المورد</button>
                    </form>
                </div>
            )}
        </div>
    );
};
window.SuppliersModule = SuppliersModule;
