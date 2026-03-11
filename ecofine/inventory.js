/**
 * 📦 inventory.js - مديول المخازن والجرد الشامل (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * التحديث: بحث سريع (باركود/اسم)، تقييم مالي للمخزون، وربط ديناميكي بتنبيهات النواقص.
 */

const { useState, useEffect, useMemo } = React;

const InventoryModule = ({ currentUser }) => {
    const [activeSubTab, setActiveSubTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [logs, setLogs] = useState([]);
    
    // حالات الواجهة
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const initialFormState = {
        name: '', barcode: '', category: '', 
        cost_price: '', wholesale_price: '', cash_price: '', installment_price: '', stock: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [catName, setCatName] = useState(''); 

    // جلب الإعدادات الديناميكية
    const minStockAlert = window.XConfig?.inventory?.globalMinStock || 3;

    // ==========================================
    // 1. تحميل البيانات والمزامنة
    // ==========================================
    const loadAllData = async () => {
        try {
            const [p, l] = await Promise.all([
                window.db.getAll('products').catch(() => []),
                window.db.getAll('inventory_logs').catch(() => [])
            ]);
            
            let c = [];
            try { 
                c = await window.db.getAll('categories'); 
                if (!Array.isArray(c)) c = [];
            } catch (err) { 
                c = JSON.parse(localStorage.getItem('eco_fallback_categories') || '[]'); 
            }

            setProducts(p || []);
            setCategories(c || []);
            setLogs((l || []).sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (err) {
            console.error("Inventory Sync Error:", err);
        }
    };

    useEffect(() => { loadAllData(); }, []);

    const triggerSync = () => {
        if (navigator.onLine && typeof window.db !== 'undefined' && window.db.syncWithCloud) {
            window.db.syncWithCloud();
        }
    };

    // ==========================================
    // 2. إحصائيات المخزون الحية (Valuation)
    // ==========================================
    const inventoryStats = useMemo(() => {
        let totalCostValue = 0;
        let lowStockCount = 0;
        
        products.forEach(p => {
            totalCostValue += (Number(p.cost_price) || 0) * (Number(p.stock) || 0);
            if (p.stock <= minStockAlert) lowStockCount++;
        });

        return { totalCostValue, lowStockCount, totalItems: products.length };
    }, [products, minStockAlert]);

    // فلترة الأصناف (بحث بالاسم أو الباركود)
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lowerTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            (p.barcode && p.barcode.toLowerCase().includes(lowerTerm))
        );
    }, [products, searchTerm]);

    // ==========================================
    // 3. إدارة التصنيفات
    // ==========================================
    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const trimmedName = catName.trim();
        if (!trimmedName) return alert("⚠️ برجاء إدخال اسم التصنيف");
        const exists = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
        if (exists) return alert("⚠️ هذا التصنيف مسجل بالفعل");

        const newCat = { id: crypto.randomUUID(), name: trimmedName };
        try {
            await window.db.add('categories', newCat);
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
        if (!window.XGuard?.canAccess(currentUser, 'owner')) {
            return alert("⛔ غير مصرح لك بحذف التصنيفات.");
        }
        if (confirm("⚠️ حذف التصنيف لن يحذف المنتجات المرتبطة به، هل تريد الاستمرار؟")) {
            try {
                await window.db.delete('categories', id);
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
    // 4. المنطق المحاسبي وإدارة الأصناف
    // ==========================================
    const validatePricing = () => {
        const cost = Number(formData.cost_price);
        const wholesale = Number(formData.wholesale_price || formData.cash_price);
        const cash = Number(formData.cash_price);
        const installment = Number(formData.installment_price || formData.cash_price);

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
                const oldProduct = await window.db.getById('products', formData.id);
                await window.db.update('products', formData.id, finalData);
                
                // تسجيل حركة التعديل إذا تغير الرصيد
                if (oldProduct && Number(oldProduct.stock) !== finalData.stock) {
                    await window.db.add('inventory_logs', {
                        product_id: formData.id, product_name: finalData.name,
                        type: 'adjustment', qty: finalData.stock - Number(oldProduct.stock), 
                        date: new Date().toISOString(), note: 'تعديل جرد يدوي', user: currentUser?.username
                    });
                }
            } else {
                const newP = await window.db.add('products', { ...finalData, created_at: new Date().toISOString() });
                await window.db.add('inventory_logs', {
                    product_id: newP.id, product_name: newP.name,
                    type: 'opening', qty: finalData.stock, date: new Date().toISOString(), user: currentUser?.username
                });
            }
            triggerSync();
            setIsModalOpen(false);
            loadAllData();
        } catch (err) { 
            alert("❌ خطأ: " + err.message); 
        } finally { 
            setIsProcessing(false); 
        }
    };

    const handleDeleteProduct = async (id, name) => {
        if (!window.XGuard?.canAccess(currentUser, 'owner')) {
            return alert("⛔ غير مصرح لك بحذف الأصناف. تواصل مع الإدارة.");
        }
        if (confirm(`⚠️ هل أنت متأكد من حذف الصنف النهائى: "${name}"؟\nهذا الإجراء لا يمكن التراجع عنه!`)) {
            try {
                await window.db.delete('products', id);
                loadAllData();
                triggerSync();
            } catch (err) {
                alert("❌ فشل حذف الصنف.");
            }
        }
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in relative">
            
            {/* مؤشرات المخزون الاستراتيجية (Valuation Dashboard) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="bg-slate-900 p-5 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">قيمة المخزون (بالتكلفة)</p>
                        <h3 className="text-2xl md:text-3xl font-black">{inventoryStats.totalCostValue.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي الأصناف المسجلة</p>
                    <h3 className="text-2xl font-black text-slate-800">{inventoryStats.totalItems} <span className="text-xs text-slate-500">صنف</span></h3>
                </div>
                <div className={`${inventoryStats.lowStockCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'} p-5 rounded-[2rem] border shadow-sm flex flex-col justify-center`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${inventoryStats.lowStockCount > 0 ? 'text-orange-600' : 'text-slate-400'}`}>نواقص أوشكت على النفاذ</p>
                    <h3 className={`text-2xl font-black ${inventoryStats.lowStockCount > 0 ? 'text-orange-700' : 'text-slate-800'}`}>{inventoryStats.lowStockCount} <span className="text-xs opacity-70">عنصر</span></h3>
                </div>
            </div>

            {/* التبويبات العلوية */}
            <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto snap-x custom-scroll">
                {[
                    {id: 'products', label: 'الأصناف', icon: '📦'},
                    {id: 'categories', label: 'التصنيفات', icon: '🏷️'},
                    {id: 'audit', label: 'الجرد والسجلات', icon: '⚖️'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex-1 snap-center flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-[1.5rem] text-[10px] font-black transition-all min-w-[100px] ${activeSubTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <span className="text-xl mb-1">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* شاشة الأصناف */}
            {activeSubTab === 'products' && (
                <div className="space-y-4 animate-in fade-in">
                    
                    {/* شريط التحكم والبحث */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <button onClick={() => { setFormData(initialFormState); setEditMode(false); setIsModalOpen(true); }} className="p-4 bg-slate-900 text-white rounded-[2rem] font-black text-xs shadow-xl active:scale-95 transition-transform shrink-0 flex items-center justify-center gap-2">
                            <span className="text-lg">➕</span> صنف جديد
                        </button>
                        <div className="flex-1 relative">
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            <input 
                                type="text" 
                                placeholder="ابحث باسم الصنف أو الباركود..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-12 py-4 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                            />
                        </div>
                    </div>
                    
                    {/* شبكة المنتجات */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(p => (
                            <div key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between group">
                                
                                {/* إشعارات الرصيد الديناميكية */}
                                {p.stock <= 0 ? (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-2xl z-10 shadow-md">نفذت الكمية</div>
                                ) : p.stock <= minStockAlert ? (
                                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-2xl z-10 shadow-md">أوشك على النفاذ</div>
                                ) : null}
                                
                                <div className="flex justify-between items-start mb-4 mt-2">
                                    <div className="pr-1 flex-1">
                                        <h4 className="font-black text-slate-800 text-sm leading-snug line-clamp-2">{p.name}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] bg-slate-100 text-slate-500 font-bold uppercase px-2 py-1 rounded-lg">{p.category || 'عام'}</span>
                                            {p.barcode && <span className="text-[9px] bg-slate-800 text-white font-mono px-2 py-1 rounded-lg"># {p.barcode}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setFormData(p); setEditMode(true); setIsModalOpen(true); }} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors">✏️</button>
                                        {(currentUser?.role === 'OWNER' || currentUser?.role === 'MODERATOR') && (
                                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">🗑️</button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100 mt-auto">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-1">الرصيد المتاح</p>
                                        <p className={`font-black text-xl leading-none ${p.stock <= 0 ? 'text-red-500' : p.stock <= minStockAlert ? 'text-orange-500' : 'text-green-600'}`}>{p.stock}</p>
                                    </div>
                                    <div className="w-px h-10 bg-slate-200 mx-2"></div>
                                    <div className="text-left flex flex-col items-end">
                                        <p className="text-[9px] text-slate-400 font-black uppercase mb-1">سعر التقسيط</p>
                                        <p className="font-black text-blue-600 text-base leading-none">{Number(p.installment_price).toLocaleString()} <span className="text-[9px] text-blue-400">ج.م</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-[2rem] border border-dashed border-slate-200">
                                <span className="text-4xl block mb-2">🕵️‍♂️</span>
                                لا توجد منتجات تطابق بحثك.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* شاشة التصنيفات */}
            {activeSubTab === 'categories' && (
                <div className="space-y-4 animate-in fade-in">
                    <form onSubmit={handleSaveCategory} className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                        <h4 className="font-black text-slate-800 text-sm flex items-center gap-2 relative z-10"><span className="text-xl">✨</span> إضافة تصنيف جديد للمخزن</h4>
                        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                            <input className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:border-purple-500 transition-colors" placeholder="مثلاً: شاشات سمارت، أجهزة كهربائية..." value={catName} onChange={(e) => setCatName(e.target.value)} />
                            <button type="submit" className="bg-purple-600 text-white py-4 px-8 rounded-2xl font-black text-xs shadow-lg shadow-purple-600/30 active:scale-95 transition-all">حفظ التصنيف</button>
                        </div>
                    </form>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">📁</div>
                                    <span className="font-black text-slate-700 text-sm truncate">{c.name}</span>
                                </div>
                                {(currentUser?.role === 'OWNER' || currentUser?.role === 'MODERATOR') && (
                                    <button onClick={() => deleteCategory(c.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* شاشة دفتر الجرد */}
            {activeSubTab === 'audit' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">سجل حركات المخزن (Audit Log)</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">تتبع دقيق لكل إضافة أو خصم من المخزون.</p>
                        </div>
                        <span className="text-3xl opacity-50">📋</span>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-right text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="p-4">التاريخ والوقت</th>
                                    <th className="p-4">الصنف</th>
                                    <th className="p-4">نوع الحركة</th>
                                    <th className="p-4 text-center">الكمية</th>
                                    <th className="p-4">المسؤول</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-xs">
                                {logs.length > 0 ? logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-[10px] text-slate-500" dir="ltr">
                                            {new Date(log.date).toLocaleString('ar-EG', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                                        </td>
                                        <td className="p-4 max-w-[150px] truncate" title={log.product_name}>{log.product_name}</td>
                                        <td className="p-4">
                                            {log.type === 'opening' && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">رصيد افتتاحي</span>}
                                            {log.type === 'sale' && <span className="text-[9px] bg-red-50 text-red-600 px-2 py-1 rounded-lg">فاتورة مبيعات</span>}
                                            {log.type === 'purchase' && <span className="text-[9px] bg-green-50 text-green-600 px-2 py-1 rounded-lg">فاتورة مشتريات</span>}
                                            {log.type === 'adjustment' && <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">تسوية جرد</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${log.qty > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {log.qty > 0 ? `+${log.qty}` : log.qty}
                                            </span>
                                        </td>
                                        <td className="p-4 text-[10px] text-slate-400">{log.user || 'النظام'}</td>
                                    </tr>
                                )) : (<tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">لا توجد حركات مسجلة حتى الآن</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 🚀 نافذة ملء الشاشة لإضافة/تعديل صنف (Full-Screen 100dvh View) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-100 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* هيدر ثابت (Sticky Header) */}
                    <div className="h-20 shrink-0 bg-slate-900 px-6 text-white flex justify-between items-center shadow-lg z-50">
                        <div>
                            <h3 className="font-black text-lg md:text-xl">{editMode ? 'تحديث بيانات الصنف' : 'إضافة صنف جديد'}</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">الربط المباشر بقاعدة البيانات</p>
                        </div>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 hover:text-white transition-colors">✕</button>
                    </div>

                    {/* مساحة التمرير الصافية (Scrollable Content) */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full p-4 md:p-8">
                        <form id="product-form" onSubmit={handleSaveProduct} className="space-y-6 max-w-4xl mx-auto pb-20">
                            
                            {/* قسم 1: البيانات الأساسية */}
                            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">1</span>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">البيانات التعريفية والربط</h4>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 block mb-2 pr-2">اسم المنتج الكامل (يظهر في العقود والبحث)</label>
                                        <input placeholder="أدخل اسم المنتج بوضوح (مثال: ثلاجة شارب 18 قدم انفرتر أسود)..." required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 block mb-2 pr-2">التصنيف (القسم)</label>
                                            <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                                <option value="">-- اضغط للاختيار --</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 block mb-2 pr-2">رقم الباركود (لتسريع البيع)</label>
                                            <div className="relative">
                                                <input placeholder="اسحب الباركود بجهاز الاسكانر..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">|||</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* قسم 2: التسعير المحاسبي */}
                            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <span className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-black">2</span>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">هيكل التسعير والجرد الفعلي</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PriceInp label="سعر التكلفة (شراء)" val={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                                    <PriceInp label="سعر الجملة" val={formData.wholesale_price} onChange={v => setFormData({...formData, wholesale_price: v})} />
                                    <PriceInp label="سعر البيع النقدي (كاش)" val={formData.cash_price} onChange={v => setFormData({...formData, cash_price: v})} />
                                    <PriceInp label="سعر التقسيط الإجمالي" val={formData.installment_price} onChange={v => setFormData({...formData, installment_price: v})} isHighlight={true} />
                                </div>
                                
                                <div className="pt-6 mt-6 border-t border-slate-100">
                                    <div className="bg-slate-900 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                                        <div className="text-right">
                                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">الرصيد المتاح (الكمية الفعلية على الرف)</label>
                                            <p className="text-xs text-slate-400 font-bold">تأكد من مطابقة الجرد الفعلي لتجنب العجز المالي.</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-2xl w-full md:w-auto">
                                            <input type="number" required min="0" placeholder="0" className="w-full md:w-32 p-3 bg-slate-950 text-white border border-slate-700 rounded-xl font-black text-2xl text-center outline-none focus:border-blue-500" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                            <span className="text-slate-500 font-black text-sm px-2">قطعة / وحدة</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* فوتر ثابت (Sticky Bottom Action) */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] z-50">
                        <button 
                            form="product-form"
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full max-w-4xl mx-auto py-5 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isProcessing ? <span className="animate-spin text-xl">⏳</span> : <span className="text-xl">💾</span>}
                            {isProcessing ? 'جاري التنفيذ والتشفير...' : (editMode ? 'تحديث بيانات الصنف واعتماد الجرد' : 'حفظ الصنف الجديد في المستودع')}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

const PriceInp = ({ label, val, onChange, isHighlight = false }) => (
    <div className="group">
        <label className={`text-[10px] font-black uppercase tracking-wider block mb-2 pr-1 transition-colors ${isHighlight ? 'text-blue-600' : 'text-slate-500 group-focus-within:text-slate-800'}`}>{label}</label>
        <div className="relative">
            <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                className={`w-full pl-4 pr-10 py-4 border rounded-2xl font-black text-sm outline-none transition-all shadow-sm ${isHighlight ? 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-2 focus:ring-blue-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400'}`} 
                value={val} 
                onChange={e => onChange(e.target.value)} 
                placeholder="0.00"
            />
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black ${isHighlight ? 'text-blue-400' : 'text-slate-400'}`}>ج.م</span>
        </div>
    </div>
);

window.InventoryModule = InventoryModule;
