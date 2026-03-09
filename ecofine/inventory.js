/**
 * 📦 inventory.js - مديول المخازن المطور (EcoFine V5.1)
 * تم إصلاح مشكلة تسجيل التصنيفات وإضافة نظام فحص التكرار
 */

const InventoryModule = () => {
    const [activeSubTab, setActiveSubTab] = React.useState('products');
    const [products, setProducts] = React.useState([]);
    const [categories, setCategories] = React.useState([]);
    const [logs, setLogs] = React.useState([]);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    
    const [formData, setFormData] = React.useState({
        name: '', category: '', cost_price: 0, wholesale_price: 0, 
        cash_price: 0, installment_price: 0, stock: 0
    });

    const [catName, setCatName] = React.useState(''); // حالة منفصلة لاسم التصنيف
    const [auditData, setAuditData] = React.useState({});

    const loadAllData = async () => {
        try {
            const [p, c, l] = await Promise.all([
                db.getAll('products'),
                db.getAll('categories'),
                db.getAll('inventory_logs')
            ]);
            setProducts(p || []);
            setCategories(c || []);
            setLogs(l || []);
        } catch (err) {
            console.error("خطأ في تحميل البيانات:", err);
        }
    };

    React.useEffect(() => { loadAllData(); }, []);

    // --- 1. إدارة التصنيفات (المصلحة) ---
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const trimmedName = catName.trim();
        
        if (!trimmedName) {
            alert("⚠️ برجاء إدخال اسم التصنيف");
            return;
        }

        // فحص التكرار يدوياً قبل الإرسال للقاعدة
        const exists = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) {
            alert("⚠️ هذا التصنيف مسجل بالفعل في القائمة");
            return;
        }

        try {
            await db.add('categories', { name: trimmedName });
            setCatName(''); // تصفير الحقل
            await loadAllData(); // تحديث القائمة
            alert("✅ تم إضافة التصنيف بنجاح");
        } catch (err) {
            console.error("Database Error:", err);
            alert("❌ فشل الحفظ: " + err);
        }
    };

    const deleteCategory = async (id) => {
        if (confirm("⚠️ حذف التصنيف لن يحذف المنتجات، هل تريد الاستمرار؟")) {
            await db.delete('categories', id);
            loadAllData();
        }
    };

    // --- 2. إدارة الأصناف ---
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
                alert("✅ تم التحديث بنجاح");
            } else {
                const newP = await db.add('products', { 
                    ...finalData, 
                    created_at: new Date().toLocaleDateString('ar-EG'),
                    opening_balance: finalData.stock 
                });
                await db.add('inventory_logs', {
                    product_id: newP.id, product_name: newP.name,
                    type: 'opening', qty: finalData.stock, date: new Date().toISOString()
                });
                alert("✅ تم تسجيل صنف جديد");
            }
            setIsModalOpen(false);
            loadAllData();
        } catch (err) { alert("❌ خطأ في الحفظ: " + err); }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* التبويبات */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border overflow-x-auto no-scrollbar">
                {[
                    {id: 'products', label: 'الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'الجرد', icon: '⚖️'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* شاشة التصنيفات المصلحة */}
            {activeSubTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in">
                    <form onSubmit={handleSaveCategory} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                        <h4 className="font-black text-slate-800 text-sm">إضافة تصنيف جديد</h4>
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
                                placeholder="مثلاً: موبايلات، شاشات..."
                                value={catName}
                                onChange={(e) => setCatName(e.target.value)}
                            />
                            <button type="submit" className="bg-slate-900 text-white px-8 rounded-2xl font-black text-xs active:scale-95 transition-transform">إضافة</button>
                        </div>
                    </form>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm group">
                                <span className="font-black text-slate-700 text-xs">{c.name}</span>
                                <button onClick={() => deleteCategory(c.id)} className="text-red-300 hover:text-red-600 transition-colors">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* شاشة الأصناف */}
            {activeSubTab === 'products' && (
                <div className="space-y-4 animate-in fade-in">
                    <button onClick={() => { setEditMode(false); setIsModalOpen(true); }} className="w-full p-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-3">
                        <span className="text-xl">➕</span> إضافة صنف جديد
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map(p => (
                            <div key={p.id} className="bg-white p-5 rounded-[2rem] border shadow-sm relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-black text-slate-800">{p.name}</h4>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{p.category || 'عام'}</p>
                                    </div>
                                    <button onClick={() => { setEditMode(true); setFormData(p); setIsModalOpen(true); }} className="p-2 bg-slate-50 rounded-xl text-blue-600">✏️</button>
                                </div>
                                <div className="mt-4 flex justify-between items-end border-t pt-4">
                                    <div className="text-xs">
                                        <p className="text-slate-400 font-bold">الرصيد</p>
                                        <p className="font-black text-slate-800 text-lg">{p.stock}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-slate-400 font-bold text-[9px]">سعر القسط</p>
                                        <p className="font-black text-blue-600">{p.installment_price} ج</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* مودال الصنف */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveProduct} className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center border-b pb-4 font-black">
                            <h3>{editMode ? 'تعديل الصنف' : 'صنف جديد'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-2xl">✕</button>
                        </div>
                        <div className="space-y-4">
                            <input placeholder="اسم المنتج" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    <option value="">اختر التصنيف...</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <input placeholder="الكمية" type="number" disabled={editMode} className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <PriceInp label="التكلفة" val={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                                <PriceInp label="الجملة" val={formData.wholesale_price} onChange={v => setFormData({...formData, wholesale_price: v})} />
                                <PriceInp label="الكاش" val={formData.cash_price} onChange={v => setFormData({...formData, cash_price: v})} />
                                <PriceInp label="القسط" val={formData.installment_price} onChange={v => setFormData({...formData, installment_price: v})} />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4">حفظ</button>
                    </form>
                </div>
            )}
        </div>
    );
};

const PriceInp = ({ label, val, onChange }) => (
    <div>
        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">{label}</label>
        <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={val} onChange={e => onChange(e.target.value)} />
    </div>
);

window.InventoryModule = InventoryModule;
