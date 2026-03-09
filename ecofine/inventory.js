// inventory.js - مديول المخازن المطور (إدارة الأصناف والهوامش الربحية)

const InventoryModule = () => {
    const [products, setProducts] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const [currentId, setCurrentId] = React.useState(null);
    
    const [formData, setFormData] = React.useState({
        name: '', category: 'إلكترونيات', 
        cost_price: 0,       // سعر الشراء
        wholesale_price: 0,  // سعر الجملة
        cash_price: 0,       // سعر الكاش
        installment_price: 0,// سعر القسط
        stock: 0,
        created_at: ''
    });

    const loadData = async () => {
        const data = await db.getAll('products');
        setProducts(data);
    };

    React.useEffect(() => { loadData(); }, []);

    const openModal = (product = null) => {
        if (product) {
            setEditMode(true);
            setCurrentId(product.id);
            setFormData(product);
        } else {
            setEditMode(false);
            setCurrentId(null);
            setFormData({ 
                name: '', category: 'إلكترونيات', cost_price: 0, 
                wholesale_price: 0, cash_price: 0, installment_price: 0, 
                stock: 0, created_at: new Date().toLocaleDateString('ar-EG') 
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // التحقق من منطق الأسعار (تكلفة < جملة < كاش < قسط)
        if (Number(formData.cost_price) >= Number(formData.wholesale_price)) {
            alert("⚠️ خطأ: يجب أن يكون سعر الجملة أكبر من سعر التكلفة");
            return;
        }

        const data = {
            ...formData,
            cost_price: Number(formData.cost_price),
            wholesale_price: Number(formData.wholesale_price),
            cash_price: Number(formData.cash_price),
            installment_price: Number(formData.installment_price),
            stock: Number(formData.stock)
        };

        try {
            if (editMode) {
                // في التعديل: نحدث كل شيء إلا الكمية (تعدل من المشتريات فقط)
                await db.update('products', currentId, data);
            } else {
                // في الإضافة لأول مرة: نسجل التاريخ والكمية الافتتاحية
                await db.add('products', { ...data, created_at: new Date().toLocaleDateString('ar-EG') });
            }
            setIsModalOpen(false);
            loadData();
        } catch (err) { alert("❌ خطأ في الحفظ"); }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <h3 className="font-black text-slate-800">تعريف الأصناف</h3>
                <button onClick={() => openModal()} className="bg-blue-600 text-white px-5 py-2 rounded-2xl font-bold text-xs">
                    + إضافة صنف جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => {
                    const cashMargin = p.cash_price - p.cost_price;
                    const instMargin = p.installment_price - p.cost_price;

                    return (
                        <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative">
                            <div className="flex justify-between mb-4">
                                <div>
                                    <h4 className="font-black text-slate-800">{p.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">تاريخ الإضافة: {p.created_at}</p>
                                </div>
                                <button onClick={() => openModal(p)} className="p-2 bg-slate-50 rounded-xl text-blue-600">✏️</button>
                            </div>

                            {/* شبكة الأسعار والهوامش */}
                            <div className="grid grid-cols-2 gap-2">
                                <PriceTag label="التكلفة" value={p.cost_price} color="slate" />
                                <PriceTag label="الجملة" value={p.wholesale_price} color="amber" />
                                <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
                                    <p className="text-[9px] text-green-600 font-bold">الكاش (ربح: {cashMargin})</p>
                                    <p className="font-black text-green-700">{p.cash_price} ج</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                                    <p className="text-[9px] text-blue-600 font-bold">القسط (ربح: {instMargin})</p>
                                    <p className="font-black text-blue-700">{p.installment_price} ج</p>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <span className={`px-4 py-1 rounded-full text-xs font-black ${p.stock > 0 ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-600'}`}>
                                    الرصيد الحالي: {p.stock}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* مودال الإضافة/التعديل */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleSave} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl">
                        <h3 className="text-xl font-black border-b pb-4">{editMode ? 'تعديل البيانات الأساسية' : 'إضافة صنف افتتاح أول مرة'}</h3>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                            <input placeholder="اسم المنتج" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="opacity-70">
                                    <label className="text-[10px] font-bold text-slate-400">الكمية {editMode && '(تعدل من المشتريات فقط)'}</label>
                                    <input type="number" disabled={editMode} className="w-full p-3 bg-slate-100 border rounded-xl font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400">سعر التكلفة (الشراء)</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400">سعر الجملة</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.wholesale_price} onChange={e => setFormData({...formData, wholesale_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400">سعر الكاش</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.cash_price} onChange={e => setFormData({...formData, cash_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400">سعر القسط</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.installment_price} onChange={e => setFormData({...formData, installment_price: e.target.value})} />
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 rounded-2xl text-[10px] font-bold text-amber-700">
                                ℹ️ هامش ربح القسط حالياً: {formData.installment_price - formData.cost_price} ج.م
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t">
                            <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black">حفظ التغييرات</button>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 bg-slate-100 rounded-2xl font-bold">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const PriceTag = ({ label, value, color }) => (
    <div className={`bg-${color}-50 p-2 rounded-2xl border border-${color}-100`}>
        <p className={`text-[9px] text-${color}-600 font-bold`}>{label}</p>
        <p className={`font-black text-${color}-700 text-xs`}>{value} ج</p>
    </div>
);

window.InventoryModule = InventoryModule;
