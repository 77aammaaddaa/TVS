/**
 * 📦 inventory.js - مديول المخازن الشامل (EcoFine V5)
 * إدارة الأصناف، التصنيفات، الجرد، وسجل الحركة
 */

const InventoryModule = () => {
    // --- الحالات (States) ---
    const [activeSubTab, setActiveSubTab] = React.useState('products');
    const [products, setProducts] = React.useState([]);
    const [categories, setCategories] = React.useState([]);
    const [logs, setLogs] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    
    // بيانات الصنف
    const [formData, setFormData] = React.useState({
        name: '', category: '', cost_price: 0, wholesale_price: 0, 
        cash_price: 0, installment_price: 0, stock: 0
    });

    // بيانات التصنيف
    const [catData, setCatData] = React.useState({ name: '' });
    const [auditData, setAuditData] = React.useState({});

    // --- تحميل البيانات ---
    const loadAllData = async () => {
        const [p, c, l] = await Promise.all([
            db.getAll('products'),
            db.getAll('categories'),
            db.getAll('inventory_logs')
        ]);
        setProducts(p || []);
        setCategories(c || []);
        setLogs(l || []);
    };

    React.useEffect(() => { loadAllData(); }, []);

    // --- 1. إدارة الأصناف (Products) ---
    const handleSaveProduct = async (e) => {
        e.preventDefault();
        try {
            const finalData = {
                ...formData,
                cost_price: Number(formData.cost_price),
                wholesale_price: Number(formData.wholesale_price),
                cash_price: Number(formData.cash_price),
                installment_price: Number(formData.installment_price),
                stock: Number(formData.stock)
            };

            if (editMode) {
                await db.update('products', formData.id, finalData);
                alert("✅ تم تحديث بيانات الصنف");
            } else {
                const newP = await db.add('products', { 
                    ...finalData, 
                    created_at: new Date().toLocaleDateString('ar-EG'),
                    opening_balance: finalData.stock 
                });
                // تسجيل أول مدة
                await db.add('inventory_logs', {
                    product_id: newP.id, product_name: newP.name,
                    type: 'opening', qty: finalData.stock, date: new Date().toISOString()
                });
                alert("✅ تم تسجيل صنف جديد بنجاح");
            }
            setIsModalOpen(false);
            loadAllData();
        } catch (err) { alert("❌ خطأ في الحفظ"); }
    };

    // --- 2. إدارة التصنيفات (Categories) ---
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!catData.name) return;
        try {
            await db.add('categories', { name: catData.name });
            setCatData({ name: '' });
            setIsCatModalOpen(false);
            loadAllData();
            alert("✅ تم إضافة التصنيف بنجاح");
        } catch (err) { alert("❌ التصنيف موجود بالفعل"); }
    };

    const deleteCategory = async (id) => {
        if (confirm("⚠️ هل تريد حذف هذا التصنيف؟ لن تتأثر المنتجات المرتبطة به.")) {
            await db.delete('categories', id);
            loadAllData();
        }
    };

    // --- 3. محرك الجرد (Audit) ---
    const runAudit = async () => {
        if (!confirm("⚠️ هل تأكدت من العد الفعلي؟ سيتم تسوية المخزن الآن.")) return;
        for (const pid in auditData) {
            const product = products.find(p => p.id === pid);
            const actual = Number(auditData[pid]);
            const diff = actual - product.stock;
            if (diff !== 0) {
                await db.update('products', pid, { stock: actual });
                await db.add('inventory_logs', {
                    product_id: pid, product_name: product.name,
                    type: 'audit', qty: diff, date: new Date().toISOString()
                });
            }
        }
        alert("✅ تمت عملية الجرد بنجاح");
        setAuditData({});
        loadAllData();
    };

    // --- الواجهة (UI) ---
    return (
        <div className="space-y-6 pb-20">
            {/* التبويبات */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto no-scrollbar" dir="rtl">
                {[
                    {id: 'products', label: 'الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'الجرد', icon: '⚖️'},
                    {id: 'logs', label: 'السجل', icon: '📜'}
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

            {/* محتوى التصنيفات */}
            {activeSubTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="bg-white p-4 rounded-3xl border border-dashed border-slate-300">
                        <h4 className="font-black text-sm mb-3">إضافة تصنيف جديد</h4>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 p-3 bg-slate-50 border rounded-xl font-bold" 
                                placeholder="اسم التصنيف (مثلاً: موبايلات)"
                                value={catData.name}
                                onChange={(e) => setCatData({name: e.target.value})}
                            />
                            <button onClick={handleSaveCategory} className="bg-blue-600 text-white px-6 rounded-xl font-black text-xs">إضافة</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm">
                                <span className="font-black text-slate-700 text-sm">{c.name}</span>
                                <button onClick={() => deleteCategory(c.id)} className="text-red-400">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* محتوى الأصناف */}
            {activeSubTab === 'products' && (
                <div className="space-y-4 animate-in fade-in">
                    <button onClick={() => { setEditMode(false); setIsModalOpen(true); }} className="w-full p-4 bg-blue-600 text-white rounded-3xl font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                        <span>➕</span> إضافة صنف جديد
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map(p => {
                            const margin = p.installment_price - p.cost_price;
                            return (
                                <div key={p.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-black text-slate-800">{p.name}</h4>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase">{p.category || 'بدون تصنيف'}</p>
                                        </div>
                                        <button onClick={() => { setEditMode(true); setFormData(p); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl">✏️</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-[9px] text-slate-400 font-bold">الرصيد</p>
                                            <p className="font-black text-slate-800">{p.stock}</p>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded-xl text-center">
                                            <p className="text-[9px] text-blue-400 font-bold">ربح القسط</p>
                                            <p className="font-black text-blue-600">+{margin} ج</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* محتوى الجرد */}
            {activeSubTab === 'audit' && (
                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom">
                    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                        <span className="font-black text-xs">جرد المخزن الفعلي</span>
                        <button onClick={runAudit} className="bg-green-600 px-4 py-2 rounded-xl text-[10px] font-black">اعتماد الجرد</button>
                    </div>
                    <div className="divide-y max-h-[60vh] overflow-y-auto">
                        {products.map(p => (
                            <div key={p.id} className="p-4 flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs">{p.name} <br/><small className="text-slate-400">السيستم: {p.stock}</small></span>
                                <input 
                                    type="number" 
                                    className="w-20 p-2 bg-slate-50 border-2 border-blue-100 rounded-xl text-center font-black"
                                    placeholder="الفعلي"
                                    onChange={(e) => setAuditData({...auditData, [p.id]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* مودال الصنف */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveProduct} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h3 className="font-black">{editMode ? 'تعديل الصنف' : 'صنف جديد'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)}>✕</button>
                        </div>
                        
                        <div className="space-y-4 text-right">
                            <div>
                                <label className="text-[10px] font-black text-slate-400">اسم المنتج</label>
                                <input required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">التصنيف</label>
                                    <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="">اختر...</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">الكمية الافتتاحية</label>
                                    <input type="number" disabled={editMode} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">سعر التكلفة</label>
                                    <input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">سعر الجملة</label>
                                    <input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.wholesale_price} onChange={e => setFormData({...formData, wholesale_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">سعر الكاش</label>
                                    <input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl" value={formData.cash_price} onChange={e => setFormData({...formData, cash_price: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400">سعر القسط</label>
                                    <input type="number" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" value={formData.installment_price} onChange={e => setFormData({...formData, installment_price: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black mt-4">حفظ بيانات الصنف</button>
                    </form>
                </div>
            )}
        </div>
    );
};

window.InventoryModule = InventoryModule;
