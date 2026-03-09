// inventory.js - النسخة الاحترافية الشاملة (X-Holding Inventory Pro)

const InventoryModule = () => {
    const [activeSubTab, setActiveSubTab] = React.useState('products');
    const [products, setProducts] = React.useState([]);
    const [categories, setCategories] = React.useState([]);
    const [logs, setLogs] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    
    // حالة الجرد (تخزين القيم المدخلة يدوياً)
    const [auditData, setAuditData] = React.useState({});

    const [formData, setFormData] = React.useState({
        name: '', category: '', cost_price: 0, wholesale_price: 0, 
        cash_price: 0, installment_price: 0, stock: 0
    });

    const loadData = async () => {
        const p = await db.getAll('products');
        const c = await db.getAll('categories');
        const l = await db.getAll('inventory_logs');
        setProducts(p);
        setCategories(c);
        setLogs(l);
    };

    React.useEffect(() => { loadData(); }, []);

    // 1. إدارة الأصناف
    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await db.update('products', formData.id, formData);
            } else {
                const newProduct = await db.add('products', { 
                    ...formData, 
                    created_at: new Date().toLocaleDateString('ar-EG'),
                    opening_balance: formData.stock // رصيد أول المدة
                });
                // تسجيل رصيد أول مدة في السجل
                await db.add('inventory_logs', {
                    product_id: newProduct.id,
                    product_name: newProduct.name,
                    type: 'opening',
                    qty: formData.stock,
                    date: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            loadData();
        } catch (err) { alert("خطأ في الحفظ"); }
    };

    // 2. إدارة الجرد (تسوية المخزون)
    const runAudit = async () => {
        if (!confirm("⚠️ سيتم اعتماد الكميات الفعلية وتصفير الفروقات.. هل أنت متأكد؟")) return;
        
        for (const pid in auditData) {
            const product = products.find(p => p.id === pid);
            const actualQty = Number(auditData[pid]);
            const diff = actualQty - product.stock;

            if (diff !== 0) {
                // تحديث الكمية في المخزن
                await db.update('products', pid, { stock: actualQty });
                // تسجيل حركة "تسوية جرد"
                await db.add('inventory_logs', {
                    product_id: pid,
                    product_name: product.name,
                    type: 'audit_adjustment',
                    qty: diff, // الفرق (سواء عجز بالناقص أو زيادة بالموجب)
                    actual_before: product.stock,
                    actual_after: actualQty,
                    date: new Date().toISOString()
                });
            }
        }
        alert("✅ انتهى الجرد وتمت تسوية الكميات");
        setAuditData({});
        loadData();
    };

    return (
        <div className="space-y-6">
            {/* التبويبات الفرعية */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto no-scrollbar">
                {[
                    {id: 'products', label: 'الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'الجرد الفعلي', icon: '⚖️'},
                    {id: 'logs', label: 'حركة المخزن', icon: '📜'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* محتوى الأصناف */}
            {activeSubTab === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                    <button onClick={() => { setEditMode(false); setIsModalOpen(true); }} className="md:col-span-2 p-4 border-2 border-dashed border-slate-300 rounded-3xl text-slate-400 font-bold hover:bg-slate-50">
                        + إضافة صنف جديد (رصيد أول مدة)
                    </button>
                    {products.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-3xl border shadow-sm">
                            <div className="flex justify-between">
                                <h4 className="font-black text-slate-800">{p.name}</h4>
                                <span className="text-blue-600 font-black">{p.stock} قطعة</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">التصنيف: {p.category || 'عام'}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* محتوى الجرد */}
            {activeSubTab === 'audit' && (
                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom">
                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                        <span className="font-black">نموذج الجرد الدوري</span>
                        <button onClick={runAudit} className="bg-green-600 px-4 py-2 rounded-xl text-xs font-black">اعتماد الجرد</button>
                    </div>
                    <div className="divide-y max-h-[60vh] overflow-y-auto">
                        {products.map(p => (
                            <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 italic font-bold">المفترض بالنظام: {p.stock}</p>
                                </div>
                                <div className="w-24">
                                    <input 
                                        type="number" 
                                        placeholder="العد الفعلي"
                                        className="w-full p-2 bg-slate-50 border-2 border-blue-100 rounded-xl text-center font-black text-blue-600 focus:border-blue-500 outline-none"
                                        onChange={(e) => setAuditData({...auditData, [p.id]: e.target.value})}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* سجل الحركة */}
            {activeSubTab === 'logs' && (
                <div className="space-y-3 animate-in fade-in">
                    {logs.sort((a,b) => new Date(b.date) - new Date(a.date)).map((log, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${log.type === 'sale' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {log.type === 'opening' ? '🏁' : log.type === 'sale' ? '📉' : '⚖️'}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{log.product_name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(log.date).toLocaleString('ar-EG')}</p>
                                </div>
                            </div>
                            <div className="text-left font-black">
                                <span className={log.qty >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {log.qty > 0 ? `+${log.qty}` : log.qty}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* المودال الشامل للأصناف (يستخدم القائمة الديناميكية للتصنيفات) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveProduct} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl">
                        <div className="flex justify-between items-center border-b pb-4 font-black">
                            <h3>{editMode ? 'تحديث بيانات صنف' : 'إضافة صنف افتتاح أول مرة'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        <input placeholder="اسم المنتج" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                <option value="">اختر التصنيف...</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <input placeholder="رصيد البداية" type="number" disabled={editMode} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <PriceInput label="التكلفة" value={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                            <PriceInput label="الجملة" value={formData.wholesale_price} onChange={v => setFormData({...formData, wholesale_price: v})} />
                            <PriceInput label="الكاش" value={formData.cash_price} onChange={v => setFormData({...formData, cash_price: v})} />
                            <PriceInput label="القسط" value={formData.installment_price} onChange={v => setFormData({...formData, installment_price: v})} />
                        </div>
                        
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4">حفظ البيانات</button>
                    </form>
                </div>
            )}
        </div>
    );
};

// مكون صغير لمدخلات الأسعار
const PriceInput = ({ label, value, onChange }) => (
    <div>
        <label className="text-[10px] font-black text-slate-400 uppercase mr-2">{label}</label>
        <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={value} onChange={e => onChange(e.target.value)} />
    </div>
);

window.InventoryModule = InventoryModule;
