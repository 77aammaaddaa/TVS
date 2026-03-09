/**
 * 📦 inventory.js - مديول المخازن والجرد الشامل (Eco Fine Pro V6 Turbo)
 * المطور: M H 4 Tech
 * التحديث V9.9: منطق محاسبي للتسعير، إصلاح واجهات الموبايل، ومحرك طوارئ للتصنيفات.
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
    
    // حالة الصنف
    const initialFormState = {
        name: '', barcode: '', category: '', 
        cost_price: '', wholesale_price: '', cash_price: '', installment_price: '', stock: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // حالة التصنيف
    const [catName, setCatName] = useState(''); 

    // ==========================================
    // 1. تحميل البيانات (مع محرك الطوارئ للتصنيفات)
    // ==========================================
    const loadAllData = async () => {
        try {
            const [p, l] = await Promise.all([
                db.getAll('products').catch(() => []),
                db.getAll('inventory_logs').catch(() => [])
            ]);
            
            // محرك الطوارئ: لو جدول التصنيفات مش موجود في DB، هنسحب من الذاكرة المحلية
            let c = [];
            try { 
                c = await db.getAll('categories'); 
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
    // 2. إدارة التصنيفات (محمية ضد الأعطال)
    // ==========================================
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const trimmedName = catName.trim();
        
        if (!trimmedName) return alert("⚠️ برجاء إدخال اسم التصنيف");

        const exists = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) return alert("⚠️ هذا التصنيف مسجل بالفعل في القائمة");

        const newCat = { id: crypto.randomUUID(), name: trimmedName };

        try {
            // محاولة الحفظ في قاعدة البيانات
            await db.add('categories', newCat);
        } catch (err) {
            // تفعيل الطوارئ: الحفظ محلياً إذا لم يكن الجدول موجوداً
            const localCats = JSON.parse(localStorage.getItem('eco_fallback_categories') || '[]');
            localCats.push(newCat);
            localStorage.setItem('eco_fallback_categories', JSON.stringify(localCats));
        }

        setCatName('');
        await loadAllData();
        triggerSync();
        alert("✅ تم إضافة التصنيف بنجاح");
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
        if (cost > wholesale && wholesale > 0) return "🚫 خطأ محاسبي: سعر التكلفة لا يمكن أن يكون أعلى من سعر الجملة!";
        if (wholesale > cash) return "🚫 خطأ محاسبي: سعر الجملة لا يمكن أن يكون أعلى من سعر الكاش!";
        if (cash > installment && installment > 0) return "🚫 خطأ محاسبي: سعر الكاش لا يمكن أن يكون أعلى من سعر التقسيط!";
        
        return null; // لا توجد أخطاء
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        
        // 1. الفحص المحاسبي الصارم
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
                
                // تسجيل الفرق في الجرد لو حصل تعديل يدوي للرصيد
                if (oldProduct && Number(oldProduct.stock) !== finalData.stock) {
                    await db.add('inventory_logs', {
                        product_id: formData.id, 
                        product_name: finalData.name,
                        type: 'adjustment', 
                        qty: finalData.stock - Number(oldProduct.stock), 
                        date: new Date().toISOString(),
                        note: 'تسوية جردية لتصحيح الرصيد'
                    });
                }
                alert("✅ تم تحديث بيانات وتسعير الصنف بنجاح");
            } else {
                const newP = await db.add('products', { 
                    ...finalData, 
                    created_at: new Date().toISOString(),
                    opening_balance: finalData.stock 
                });
                await db.add('inventory_logs', {
                    product_id: newP.id, 
                    product_name: newP.name,
                    type: 'opening', 
                    qty: finalData.stock, 
                    date: new Date().toISOString(),
                    note: 'رصيد افتتاحي (صنف جديد)'
                });
                alert("✅ تم تسجيل الصنف الجديد في المخزن");
            }
            
            triggerSync();
            setIsModalOpen(false);
            loadAllData();
        } catch (err) { 
            alert("❌ خطأ في الحفظ: " + err.message); 
        } finally {
            setIsProcessing(false);
        }
    };

    const openAddModal = () => {
        setFormData(initialFormState);
        setEditMode(false);
        setIsModalOpen(true);
    };

    const openEditModal = (product) => {
        setFormData(product);
        setEditMode(true);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in">
            {/* التبويبات العلوية */}
            <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto custom-scroll">
                {[
                    {id: 'products', label: 'دليل الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'دفتر الجرد', icon: '⚖️'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-4 px-4 rounded-[1.5rem] text-[10px] md:text-xs font-black transition-all min-w-[100px] ${activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                        <span className="text-xl md:text-base">{tab.icon}</span> 
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* 🏷️ شاشة التصنيفات */}
            {activeSubTab === 'categories' && (
                <div className="space-y-6 animate-in fade-in">
                    <form onSubmit={handleSaveCategory} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2"><span className="text-xl">✨</span> إضافة تصنيف رئيسي</h4>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input 
                                className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm" 
                                placeholder="مثلاً: هواتف محمولة، إكسسوارات..."
                                value={catName}
                                onChange={(e) => setCatName(e.target.value)}
                            />
                            <button type="submit" className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full md:w-auto">
                                حفظ 🚀
                            </button>
                        </div>
                    </form>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {categories.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                                <span className="font-black text-slate-700 text-xs truncate pr-2">{c.name}</span>
                                <button onClick={() => deleteCategory(c.id)} className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 📦 شاشة الأصناف */}
            {activeSubTab === 'products' && (
                <div className="space-y-6 animate-in fade-in">
                    <button onClick={openAddModal} className="w-full p-5 bg-slate-900 text-white rounded-[2.5rem] font-black shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-800">
                        <span className="text-xl">➕</span> تسجيل صنف جديد في المخزن
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(p => (
                            <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                                {p.stock <= 0 && <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl z-10 shadow-md">نفذت الكمية</div>}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="pr-2">
                                        <h4 className="font-black text-slate-800 text-sm leading-snug line-clamp-2">{p.name}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold uppercase tracking-widest px-2 py-1 rounded-lg">{p.category || 'غير مصنف'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => openEditModal(p)} className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shrink-0">✏️</button>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100">
                                    <div className="text-center">
                                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">الرصيد المتاح</p>
                                        <p className={`font-black text-2xl leading-none ${p.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{p.stock}</p>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200 mx-2"></div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-400 font-black uppercase mb-1">سعر التقسيط</p>
                                        <p className="font-black text-blue-600 text-lg leading-none">{Number(p.installment_price).toLocaleString()} <span className="text-[10px] text-blue-400">ج.م</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ⚖️ شاشة دفتر الجرد (Audit) */}
            {activeSubTab === 'audit' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">سجل حركات المخزن</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">تتبع الوارد والمنصرف بدقة</p>
                        </div>
                        <span className="text-2xl">📋</span>
                    </div>
                    <div className="overflow-x-auto custom-scroll">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">التاريخ</th>
                                    <th className="p-4">اسم الصنف</th>
                                    <th className="p-4">نوع الحركة</th>
                                    <th className="p-4 text-center">الكمية</th>
                                    <th className="p-4">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                                {logs.length > 0 ? logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-[10px] text-slate-500 whitespace-nowrap" dir="ltr">{new Date(log.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                        <td className="p-4">{log.product_name}</td>
                                        <td className="p-4">
                                            {log.type === 'opening' && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">رصيد افتتاحي</span>}
                                            {log.type === 'sale' && <span className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-lg">منصرف بيع</span>}
                                            {log.type === 'purchase' && <span className="text-[9px] bg-green-50 text-green-600 px-2 py-1 rounded-lg">وارد مشتريات</span>}
                                            {log.type === 'adjustment' && <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">تسوية جردية</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-black text-sm ${log.qty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {log.qty > 0 ? `+${log.qty}` : log.qty}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[10px] text-slate-400">{log.note || '-'}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">لا توجد حركات مسجلة حتى الآن</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 📱 نافذة إضافة/تعديل صنف (Full-Screen Native UI) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                    
                    {/* هيدر النافذة */}
                    <div className="bg-slate-900 p-6 pt-8 text-white shrink-0 flex justify-between items-center shadow-lg relative z-20 rounded-b-[2.5rem]">
                        <div>
                            <h3 className="font-black text-xl">{editMode ? 'تحديث بيانات الصنف' : 'تسجيل صنف جديد'}</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">قاعدة بيانات المخزن الموحدة</p>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-white/20 transition-colors">✕</button>
                    </div>

                    {/* جسم الفورم */}
                    <form id="product-form" onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scroll pb-40">
                        
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">1. البيانات الأساسية</h4>
                            <input placeholder="اسم المنتج بالكامل (مطلوب)" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    <option value="">-- اختر التصنيف --</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <input placeholder="الباركود (اختياري)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm outline-none font-mono tracking-widest" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex justify-between items-center">
                                <span>2. التسعير والجرد (ج.م)</span>
                                <span className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded-lg">التكلفة &lt; الجملة &lt; الكاش &lt; القسط</span>
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <PriceInp label="التكلفة (الشراء)" val={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                                <PriceInp label="سعر الجملة" val={formData.wholesale_price} onChange={v => setFormData({...formData, wholesale_price: v})} />
                                <PriceInp label="سعر الكاش" val={formData.cash_price} onChange={v => setFormData({...formData, cash_price: v})} />
                                <PriceInp label="سعر التقسيط" val={formData.installment_price} onChange={v => setFormData({...formData, installment_price: v})} isHighlight={true} />
                            </div>
                            <div className="pt-4 border-t mt-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">الرصيد الفعلي في المخزن</label>
                                <input placeholder="الكمية المتاحة" type="number" required min="0" className="w-full p-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-black text-lg outline-none focus:border-green-500 transition-colors" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                {editMode && <p className="text-[9px] font-bold text-amber-600 mt-2">⚠️ سيتم تسجيل هذا التعديل كـ "تسوية جردية" في دفتر الجرد.</p>}
                            </div>
                        </div>

                    </form>

                    {/* زر الحفظ العائم (Bottom Fixed Bar) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-5 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] rounded-t-[2.5rem]">
                        <button 
                            form="product-form"
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full max-w-2xl mx-auto flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm shadow-2xl transition-all active:scale-95 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                            {isProcessing ? 'جاري حفظ البيانات...' : (editMode ? 'تحديث السجلات 🔄' : 'حفظ الصنف في المخزن 💾')}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

// مكون إدخال السعر المساعد
const PriceInp = ({ label, val, onChange, isHighlight = false }) => (
    <div>
        <label className={`text-[10px] font-black uppercase mb-1 block ${isHighlight ? 'text-blue-600' : 'text-slate-500'}`}>{label}</label>
        <input 
            type="number" 
            required 
            min="0"
            step="0.01"
            className={`w-full p-4 border rounded-2xl font-bold text-sm outline-none transition-colors ${isHighlight ? 'bg-blue-50 border-blue-200 text-blue-700 focus:border-blue-500' : 'bg-slate-50 border-slate-100 focus:border-slate-400 text-slate-800'}`} 
            value={val} 
            onChange={e => onChange(e.target.value)} 
        />
    </div>
);

window.InventoryModule = InventoryModule;
