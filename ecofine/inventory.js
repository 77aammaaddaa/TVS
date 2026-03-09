// inventory.js - مديول إدارة المخازن والأصناف (V4)
// وظيفة المديول: تسجيل المنتجات، تحديد أسعار الكاش والتقسيط، ومراقبة المخزون

const InventoryModule = () => {
    const [products, setProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        category: 'إلكترونيات',
        cost_price: '',
        cash_price: '',
        installment_price: '',
        stock: ''
    });

    // 1. تحميل المنتجات
    const loadProducts = async () => {
        const data = await db.getAll('products');
        setProducts(data);
    };

    useEffect(() => { loadProducts(); }, []);

    // 2. حفظ منتج جديد
    const handleSave = async (e) => {
        e.preventDefault();
        
        // تحويل القيم لنصوص رقمية لضمان الحسابات الصحيحة لاحقاً
        const productData = {
            ...formData,
            cost_price: Number(formData.cost_price),
            cash_price: Number(formData.cash_price),
            installment_price: Number(formData.installment_price),
            stock: Number(formData.stock)
        };

        try {
            await db.add('products', productData);
            setIsModalOpen(false);
            setFormData({ name: '', category: 'إلكترونيات', cost_price: '', cash_price: '', installment_price: '', stock: '' });
            loadProducts();
            alert("✅ تم إضافة الصنف للمخزن بنجاح");
        } catch (err) {
            alert("❌ خطأ في حفظ البيانات");
        }
    };

    return (
        <div className="space-y-6">
            {/* بار البحث والإضافة */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <input 
                    type="text" placeholder="ابحث عن منتج..." 
                    className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-2xl font-black flex items-center justify-center gap-2"
                >
                    <span>📦</span> إضافة صنف جديد
                </button>
            </div>

            {/* عرض المخزن (Cards للموبايل) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.filter(p => p.name.includes(searchTerm)).map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl ${p.stock > 5 ? 'bg-green-600' : 'bg-red-600'}`}>
                            مخزن: {p.stock}
                        </div>
                        <h4 className="font-black text-slate-800 mb-4 mt-2">{p.name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-slate-400 mb-1">سعر الكاش</p>
                                <p className="font-black text-green-600">{p.cash_price} ج</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <p className="text-slate-400 mb-1">سعر التقسيط</p>
                                <p className="font-black text-blue-600">{p.installment_price} ج</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs">
                            <span className="text-slate-400 italic">التكلفة: {p.cost_price} ج</span>
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{p.category}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* مودال إضافة صنف */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg h-[80vh] md:h-auto overflow-hidden flex flex-col animate-slide-up">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-black text-slate-800">إضافة صنف للمخزن</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-3xl text-slate-400">×</button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-right">
                            <div>
                                <label className="text-xs font-bold text-slate-500">اسم المنتج / الصنف</label>
                                <input required className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500">التصنيف</label>
                                    <select className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option>إلكترونيات</option><option>أجهزة منزلية</option><option>موبايلات</option><option>أخرى</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500">الكمية المتوفرة</label>
                                    <input required type="number" className="w-full p-3 mt-1 bg-slate-50 border rounded-xl" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                </div>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-2xl space-y-4 border border-blue-100">
                                <h5 className="text-blue-700 font-bold text-xs">إدارة الأسعار (ج.م)</h5>
                                <div>
                                    <label className="text-[10px] font-bold text-blue-400">سعر التكلفة علي السنتر</label>
                                    <input required type="number" className="w-full p-2 mt-1 bg-white border border-blue-200 rounded-lg" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400">سعر البيع كاش</label>
                                        <input required type="number" className="w-full p-2 mt-1 bg-white border border-blue-200 rounded-lg" value={formData.cash_price} onChange={e => setFormData({...formData, cash_price: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-400">سعر البيع تقسيط</label>
                                        <input required type="number" className="w-full p-2 mt-1 bg-white border border-blue-200 rounded-lg font-black text-blue-600" value={formData.installment_price} onChange={e => setFormData({...formData, installment_price: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4">إضافة الصنف</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

window.InventoryModule = InventoryModule;
