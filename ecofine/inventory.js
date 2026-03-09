/**
 * 📦 inventory.js - مديول المخازن والجرد الشامل (Eco Fine Pro V10.0 Turbo)
 * المطور: M H 4 Tech
 * التحديث الأخير: تحويل واجهة إضافة الأصناف لـ (Full-Screen Native View) لإنهاء تداخل الشاشات.
 */

const { useState, useEffect } = React;

const InventoryModule = () => {
    const [activeSubTab, setActiveSubTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const initialFormState = {
        name: '', barcode: '', category: '', 
        cost_price: '', wholesale_price: '', cash_price: '', installment_price: '', stock: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [catName, setCatName] = useState(''); 

    // ==========================================
    // 1. تحميل البيانات (مع محرك الطوارئ)
    // ==========================================
    const loadAllData = async () => {
        try {
            const [p, l] = await Promise.all([
                db.getAll('products').catch(() => []),
                db.getAll('inventory_logs').catch(() => [])
            ]);
            
            let c = [];
            try { 
                c = await db.getAll('categories'); 
                if (!Array.isArray(c)) c = [];
            } catch (err) { 
                c = JSON.parse(localStorage.getItem('eco_fallback_categories') || '[]'); 
            }

            setProducts(p || []);
            setCategories(c || []);
            setLogs((l || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (err) {
            console.error("خطأ في تحميل بيانات المخزن:", err);
        }
    };

    useEffect(() => { loadAllData(); }, []);

    const triggerSync = () => {
        if (navigator.onLine && typeof db !== 'undefined' && db.syncUnsyncedData) {
            db.syncUnsyncedData();
        }
    };

    // ==========================================
    // 2. إدارة التصنيفات
    // ==========================================
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const trimmedName = catName.trim();
        if (!trimmedName) return alert("⚠️ برجاء إدخال اسم التصنيف");
        const exists = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) return alert("⚠️ هذا التصنيف مسجل بالفعل");

        const newCat = { id: crypto.randomUUID(), name: trimmedName };
        try {
            await db.add('categories', newCat);
        } catch (err) {
            const localCats = JSON.parse(localStorage.getItem('eco_fallback_categories') || '[]');
            localCats.push(newCat);
            localStorage.setItem('eco_fallback_categories', JSON.stringify(localCats));
        }
        setCatName('');
        await loadAllData();
        triggerSync();
    };

    const deleteCategory = async (id) => {
        if (confirm("⚠️ حذف التصنيف لن يحذف المنتجات المرتبطة به، هل تريد الاستمرار؟")) {
            try {
                await db.delete('categories', id);
            } catch (err) {
                let localCats = JSON.parse(localStorage.getItem('eco_fallback_categories') || '[]');
                localCats = localCats.filter(c => c.id !== id);
                localStorage.setItem('eco_fallback_categories', JSON.stringify(localCats));
            }
            loadAllData();
            triggerSync();
        }
    };

    // ==========================================
    // 3. المنطق المحاسبي وإدارة الأصناف
    // ==========================================
    const validatePricing = () => {
        const cost = Number(formData.cost_price);
        const wholesale = Number(formData.wholesale_price);
        const cash = Number(formData.cash_price);
        const installment = Number(formData.installment_price);

        if (cost <= 0 || cash <= 0) return "⚠️ سعر التكلفة وسعر الكاش إجبارية ويجب أن تكون أكبر من صفر.";
        if (cost > wholesale && wholesale > 0) return "🚫 خطأ محاسبي: التكلفة لا يمكن أن تكون أعلى من الجملة!";
        if (wholesale > cash) return "🚫 خطأ محاسبي: الجملة لا يمكن أن تكون أعلى من الكاش!";
        if (cash > installment && installment > 0) return "🚫 خطأ محاسبي: الكاش لا يمكن أن يكون أعلى من التقسيط!";
        
        return null;
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const validationError = validatePricing();
        if (validationError) return alert(validationError);

        setIsProcessing(true);
        try {
            const finalData = {
                ...formData,
                cost_price: Number(formData.cost_price),
                wholesale_price: Number(formData.wholesale_price || formData.cash_price),
                cash_price: Number(formData.cash_price),
                installment_price: Number(formData.installment_price || formData.cash_price),
                stock: Number(formData.stock)
            };

            if (editMode) {
                const oldProduct = await db.getById('products', formData.id);
                await db.update('products', formData.id, finalData);
                if (oldProduct && Number(oldProduct.stock) !== finalData.stock) {
                    await db.add('inventory_logs', {
                        product_id: formData.id, product_name: finalData.name,
                        type: 'adjustment', qty: finalData.stock - Number(oldProduct.stock), 
                        date: new Date().toISOString(), note: 'تعديل جرد'
                    });
                }
            } else {
                const newP = await db.add('products', { ...finalData, created_at: new Date().toISOString() });
                await db.add('inventory_logs', {
                    product_id: newP.id, product_name: newP.name,
                    type: 'opening', qty: finalData.stock, date: new Date().toISOString()
                });
            }
            triggerSync();
            setIsModalOpen(false);
            loadAllData();
        } catch (err) { alert("❌ خطأ: " + err.message); } finally { setIsProcessing(false); }
    };

    return (
        <div className="space-y-4 pb-20 animate-in fade-in relative">
            
            {/* التبويبات العلوية */}
            <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto snap-x custom-scroll">
                {[
                    {id: 'products', label: 'الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'الجرد', icon: '⚖️'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex-1 snap-center flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-[1.5rem] text-[10px] font-black transition-all min-w-[100px] ${activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
                        <span className="text-xl mb-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* شاشة الأصناف */}
            {activeSubTab === 'products' && (
                <div className="space-y-4 animate-in fade-in">
                    <button onClick={() => { setFormData(initialFormState); setEditMode(false); setIsModalOpen(true); }} className="w-full p-4 bg-slate-900 text-white rounded-[2rem] font-black text-xs shadow-xl flex items-center justify-center gap-2">
                        <span className="text-lg">➕</span> إضافة صنف جديد للمخزن
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map(p => (
                            <div key={p.id} className="bg-white p-4 rounded-[2rem] border shadow-sm relative overflow-hidden flex flex-col justify-between">
                                {p.stock <= 0 && <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl z-10 shadow-md">نفذت الكمية</div>}
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div className="pr-1 flex-1">
                                        <h4 className="font-black text-slate-800 text-xs leading-snug line-clamp-2">{p.name}</h4>
                                        <span className="text-[8px] bg-slate-100 text-slate-500 font-bold uppercase px-2 py-0.5 rounded-md mt-1.5 inline-block">{p.category || 'عام'}</span>
                                    </div>
                                    <button onClick={() => { setFormData(p); setEditMode(true); setIsModalOpen(true); }} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">✏️</button>
                                </div>
                                
                                <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center border border-slate-100">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">الرصيد</p>
                                        <p className={`font-black text-lg leading-none ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200 mx-1"></div>
                                    <div className="text-left">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">سعر القسط</p>
                                        <p className="font-black text-blue-600 text-sm leading-none">{Number(p.installment_price).toLocaleString()} <span className="text-[8px] text-blue-400">ج</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* شاشة التصنيفات */}
            {activeSubTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in">
                    <form onSubmit={handleSaveCategory} className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                        <h4 className="font-black text-slate-800 text-xs flex items-center gap-2"><span className="text-lg">✨</span> إضافة تصنيف</h4>
                        <div className="flex gap-2">
                            <input className="flex-1 p-4 bg-slate-50 border rounded-2xl font-bold text-sm outline-none" placeholder="مثلاً: شاشات..." value={catName} onChange={(e) => setCatName(e.target.value)} />
                            <button type="submit" className="bg-blue-600 text-white py-4 px-6 rounded-2xl font-black text-xs shadow-lg active:scale-95">حفظ</button>
                        </div>
                    </form>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center shadow-sm">
                                <span className="font-black text-slate-700 text-xs truncate pr-2">{c.name}</span>
                                <button onClick={() => deleteCategory(c.id)} className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* شاشة دفتر الجرد */}
            {activeSubTab === 'audit' && (
                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 text-xs">سجل حركات المخزن</h3>
                        <span className="text-lg">📋</span>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-right text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px]">
                                <tr>
                                    <th className="p-3">التاريخ</th>
                                    <th className="p-3">الصنف</th>
                                    <th className="p-3">الحركة</th>
                                    <th className="p-3 text-center">الكمية</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                                {logs.length > 0 ? logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="p-3 text-[9px] text-slate-500" dir="ltr">{new Date(log.date).toLocaleString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                                        <td className="p-3 max-w-[120px] truncate">{log.product_name}</td>
                                        <td className="p-3">
                                            {log.type === 'opening' && <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md">افتتاحي</span>}
                                            {log.type === 'sale' && <span className="text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md">مبيعات</span>}
                                            {log.type === 'purchase' && <span className="text-[8px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md">مشتريات</span>}
                                            {log.type === 'adjustment' && <span className="text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md">تسوية</span>}
                                        </td>
                                        <td className="p-3 text-center"><span className={`font-black ${log.qty > 0 ? 'text-green-500' : 'text-red-500'}`}>{log.qty > 0 ? `+${log.qty}` : log.qty}</span></td>
                                    </tr>
                                )) : (<tr><td colSpan="4" className="p-6 text-center text-slate-400">لا توجد حركات</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🚀 الحل الجذري: نافذة ملء الشاشة (Full-Screen 100dvh View) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* هيدر ثابت (Sticky Header) */}
                    <div className="h-20 shrink-0 bg-slate-900 px-6 text-white flex justify-between items-center shadow-md z-50 rounded-b-3xl">
                        <div>
                            <h3 className="font-black text-lg">{editMode ? 'تحديث بيانات الصنف' : 'إضافة صنف جديد'}</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">قاعدة بيانات المخزن</p>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-white/20 transition-colors">✕</button>
                    </div>

                    {/* مساحة التمرير الصافية (Scrollable Content) */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <form id="product-form" onSubmit={handleSaveProduct} className="p-5 space-y-5 pb-10 max-w-2xl mx-auto">
                            
                            {/* قسم 1 */}
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-2 tracking-widest">1. البيانات الأساسية</h4>
                                <div>
                                    <label className="text-[10px] font-black text-slate-600 block mb-1.5 pr-2">اسم المنتج الكامل</label>
                                    <input placeholder="أدخل اسم المنتج بوضوح..." required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 block mb-1.5 pr-2">التصنيف</label>
                                        <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                            <option value="">-- اختر --</option>
                                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-600 block mb-1.5 pr-2">الباركود</label>
                                        <input placeholder="اختياري" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* قسم 2 */}
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-2 tracking-widest flex justify-between items-center">
                                    <span>2. التسعير والجرد (ج.م)</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <PriceInp label="التكلفة (الشراء)" val={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                                    <PriceInp label="سعر الجملة" val={formData.wholesale_price} onChange={v => setFormData({...formData, wholesale_price: v})} />
                                    <PriceInp label="سعر الكاش" val={formData.cash_price} onChange={v => setFormData({...formData, cash_price: v})} />
                                    <PriceInp label="سعر التقسيط" val={formData.installment_price} onChange={v => setFormData({...formData, installment_price: v})} isHighlight={true} />
                                </div>
                                <div className="pt-4 border-t">
                                    <label className="text-[10px] font-black text-slate-600 uppercase mb-2 block pr-2">الكمية الفعلية في المخزن</label>
                                    <input type="number" required min="0" className="w-full p-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-black text-xl outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* فوتر ثابت (Sticky Bottom Action) */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <button 
                            form="product-form"
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full max-w-2xl mx-auto py-4 rounded-[1.5rem] font-black text-sm bg-slate-900 text-white shadow-xl active:scale-95 transition-all disabled:opacity-50 block"
                        >
                            {isProcessing ? 'جاري التنفيذ...' : (editMode ? 'تحديث بيانات الصنف 🔄' : 'حفظ الصنف في المخزن 💾')}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

const PriceInp = ({ label, val, onChange, isHighlight = false }) => (
    <div>
        <label className={`text-[10px] font-black mb-1.5 block pr-2 ${isHighlight ? 'text-blue-600' : 'text-slate-600'}`}>{label}</label>
        <input 
            type="number" 
            required 
            min="0"
            step="0.01"
            className={`w-full p-4 border rounded-2xl font-bold text-sm outline-none transition-all ${isHighlight ? 'bg-blue-50 border-blue-200 text-blue-700 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-2 focus:ring-slate-900'}`} 
            value={val} 
            onChange={e => onChange(e.target.value)} 
        />
    </div>
);

window.InventoryModule = InventoryModule;
