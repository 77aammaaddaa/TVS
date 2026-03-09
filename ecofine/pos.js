/**
 * 💻 pos.js - مديول نقطة البيع الذكية (V8.0 - X-Core Integrated)
 * واجهة الهاتف المحمول (Native Feel) لدعم البيع (كاش، شحن، تقسيط)
 * يطبق حسابات الشريعة، السقف الائتماني، والمخاطر لحظياً.
 */

const { useState, useEffect, useMemo, useCallback } = React;

const POSModule = () => {
    // ==========================================
    // 1. الحالات (States)
    // ==========================================
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [installmentsData, setInstallmentsData] = useState([]); // لحساب ديون العميل
    const [cart, setCart] = useState([]);
    
    // حالات الدفع (Checkout)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [saleType, setSaleType] = useState('cash'); // cash, shipping, installment
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [shippingFee, setShippingFee] = useState('');
    
    // حالات التقسيط الخاصة بـ X-Core
    const [instType, setInstType] = useState('monthly'); // daily, monthly
    const [instValue, setInstValue] = useState(''); // قيمة القسط اللي هيدفعه
    
    // حالة الإشعارات
    const [notification, setNotification] = useState(null);

    // ==========================================
    // 2. تحميل البيانات الأساسية
    // ==========================================
    const loadData = useCallback(async () => {
        try {
            const [p, c, i] = await Promise.all([
                db.getAll('products').catch(() => []),
                db.getAll('customers').catch(() => []),
                db.getAll('installments').catch(() => [])
            ]);
            setProducts(p.filter(item => item.stock > 0)); // المتاح فقط
            setCustomers(c.filter(cust => cust.status === 'active' && cust.credit_score >= 50)); // المؤهلين فقط للتقسيط
            setInstallmentsData(i);
        } catch (error) {
            showNotification('error', '❌ فشل في تحميل البيانات.');
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3500);
    };

    // ==========================================
    // 3. إدارة السلة (Cart Logic)
    // ==========================================
    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                if (exists.qty >= product.stock) {
                    showNotification('error', '⚠️ الكمية المطلوبة تتخطى المخزون المتاح!');
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    
    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + ((saleType === 'installment' ? item.installment_price : item.cash_price) * item.qty), 0);
    }, [cart, saleType]);

    const finalTotal = cartTotal + (saleType === 'shipping' ? Number(shippingFee || 0) : 0);

    // ==========================================
    // 4. محرك فحص إكس كور اللحظي (X-Core Live Validator)
    // ==========================================
    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || !selectedCustomer || cartTotal === 0) return null;
        if (!window.XCore) return { error: "⚠️ محرك X-Core غير متصل." };

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return null;

        // أ) حساب المديونية الحالية للعميل
        const customerInsts = installmentsData.filter(i => i.customer_id === selectedCustomer);
        const currentDebt = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

        // ب) فحص تعدد الفواتير والسقف الائتماني
        const multiCheck = window.XCore.canOpenMultiInvoice(
            customer.credit_score, 
            Number(customer.monthly_income || 0), 
            currentDebt, 
            totalPaid, 
            finalTotal
        );

        if (!multiCheck.can) return { error: multiCheck.msg };

        // ج) فحص الشروط المالية والشرعية (لو أدخل قيمة قسط)
        if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط المطلوب لحساب التقديمة." };

        const purchaseDay = new Date().getDate();
        const terms = window.XCore.calculateSaleTerms(finalTotal, instType, Number(instValue), purchaseDay);

        if (terms.error) return { error: terms.error };

        return {
            success: true,
            msg: multiCheck.msg,
            downPayment: terms.downPayment,
            maxMonths: terms.maxMonths,
            calculatedMonths: terms.calculatedMonths,
            docs: terms.docs
        };
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customers, installmentsData]);

    // ==========================================
    // 5. إتمام العملية (The Execution)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ السلة فارغة!');
        if (!selectedCustomer && saleType !== 'cash') return showNotification('error', '⚠️ يرجى اختيار العميل!');
        
        if (saleType === 'installment') {
            if (!xCoreValidation || xCoreValidation.error) {
                return showNotification('error', '🚫 لا يمكن الإتمام: لم يجتز شروط X-Core.');
            }
        }

        try {
            // 1. إنشاء الفاتورة
            const invoice = {
                customer_id: selectedCustomer || 'cash_customer',
                type: saleType,
                items: cart,
                subtotal: cartTotal,
                shipping_fee: Number(shippingFee || 0),
                total: finalTotal,
                date: new Date().toISOString(),
                status: saleType === 'shipping' ? 'pending_delivery' : 'active'
            };
            const addedInvoice = await db.add('invoices', invoice);

            // 2. خصم المخزون وتسجيل الحركة
            for (const item of cart) {
                await db.update('products', item.id, { stock: item.stock - item.qty });
                await db.add('inventory_logs', {
                    product_id: item.id, product_name: item.name,
                    type: 'sale', qty: -item.qty, date: new Date().toISOString()
                });
            }

            // 3. المعالجة المالية
            if (saleType === 'cash' || saleType === 'shipping') {
                await db.add('treasury_log', {
                    type: 'in', amount: finalTotal, reason: `مبيعات فاتورة ${addedInvoice.id}`, date: new Date().toISOString()
                });
            } else if (saleType === 'installment') {
                // تسجيل التقديمة ككاش داخل الخزينة
                await db.add('treasury_log', {
                    type: 'in', amount: xCoreValidation.downPayment, 
                    reason: `مقدم فاتورة تقسيط ${addedInvoice.id}`, date: new Date().toISOString()
                });

                // توليد الأقساط الباقية آلياً
                const remainingAmount = finalTotal - xCoreValidation.downPayment;
                const monthsCount = Math.ceil(xCoreValidation.calculatedMonths);
                const actualMonthly = remainingAmount / monthsCount;

                for (let i = 1; i <= monthsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i); // قسط كل شهر
                    // لو يومي، ممكن نعدل التاريخ ليزيد بالأيام بدلاً من الشهور حسب رغبتك، 
                    // لكن المنطق المالي يحسب المدة بالشهور ويدفعها العميل مجزأة يومياً.
                    
                    await db.add('installments', {
                        invoice_id: addedInvoice.id,
                        customer_id: selectedCustomer,
                        amount: actualMonthly, // القيمة المستحقة شهرياً
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending'
                    });
                }
            }

            showNotification('success', '✅ تم إتمام العملية وتوليد العقود بنجاح!');
            setCart([]);
            setIsCheckoutOpen(false);
            loadData();
        } catch (err) {
            showNotification('error', '❌ حدث خطأ أثناء إتمام العملية.');
        }
    };

    // توجيه العميل لإضافة عميل جديد
    const handleAddNewCustomer = () => {
        alert("💡 لإضافة عميل جديد وضامنيه للتقييم الصحيح، يرجى استخدام موديول (العملاء والضامنين) من القائمة الجانبية.");
        setIsCheckoutOpen(false);
    };

    return (
        <div className="h-full flex flex-col relative pb-24">
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl text-white font-black text-xs md:text-sm ${
                    notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* الجزء العلوي: معرض المنتجات */}
            <div className="flex-1 overflow-y-auto custom-scroll px-2 pb-4">
                <div className="bg-white p-4 rounded-3xl border shadow-sm mb-4 sticky top-0 z-10">
                    <input type="text" placeholder="ابحث عن منتج (باركود / اسم)..." className="w-full p-3 bg-slate-50 border rounded-2xl outline-none text-xs font-bold" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {products.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-3xl border hover:border-blue-500 transition-all text-right shadow-sm active:scale-95 flex flex-col justify-between h-32 relative overflow-hidden">
                            {p.stock <= 3 && <span className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-br-lg">أوشك على النفاذ</span>}
                            <p className="font-black text-slate-800 text-xs line-clamp-2 leading-relaxed">{p.name}</p>
                            <div>
                                <p className="text-blue-600 font-black text-sm">{saleType === 'installment' ? p.installment_price : p.cash_price} ج</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1">المتاح: {p.stock}</p>
                            </div>
                        </button>
                    ))}
                    {products.length === 0 && (
                        <div className="col-span-full text-center py-10 bg-slate-50 rounded-3xl border border-dashed">
                            <p className="text-slate-400 font-bold text-xs">لا توجد منتجات متاحة في المخزن.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* الشريط السفلي العائم (Mini Cart Bar) */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-4 left-4 right-4 bg-slate-900 text-white p-4 rounded-[2rem] shadow-2xl z-40 flex justify-between items-center cursor-pointer active:scale-95 transition-transform" onClick={() => setIsCheckoutOpen(true)}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black">{cart.reduce((s, i)=>s+i.qty, 0)}</div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">الإجمالي المبدئي</p>
                            <p className="font-black text-lg leading-none">{cartTotal.toLocaleString()} <span className="text-xs font-normal">ج</span></p>
                        </div>
                    </div>
                    <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-xs">مراجعة ودفع ➔</button>
                </div>
            )}

            {/* نافذة الدفع الكاملة (Full-Screen Checkout Modal) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-full">
                    {/* الهيدر */}
                    <div className="bg-slate-900 p-6 text-white shrink-0 flex justify-between items-center shadow-lg relative z-20">
                        <div>
                            <h3 className="font-black text-lg">سلة العمليات (Checkout)</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">نظام الدفع الذكي</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg hover:bg-slate-700">✕</button>
                    </div>

                    {/* المحتوى القابل للتمرير */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll pb-32">
                        
                        {/* 1. قائمة المشتريات */}
                        <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                            <h4 className="text-xs font-black text-slate-800 border-b pb-2 mb-3">المنتجات المختارة</h4>
                            <div className="space-y-3 max-h-40 overflow-y-auto custom-scroll pr-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-2">
                                        <span className="text-slate-700">{item.qty}x {item.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-blue-600">{(item.qty * (saleType === 'installment' ? item.installment_price : item.cash_price)).toLocaleString()} ج</span>
                                            <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. نوع العملية */}
                        <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                            <h4 className="text-xs font-black text-slate-800 mb-3">مسار العملية</h4>
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
                                {['cash', 'shipping', 'installment'].map(t => (
                                    <button key={t} onClick={() => setSaleType(t)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${saleType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                        {t === 'cash' ? 'كاش فوري' : t === 'shipping' ? 'شحن / توصيل' : 'نظام التقسيط'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 3. إعدادات الشحن (لو اختار شحن) */}
                        {saleType === 'shipping' && (
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm animate-in fade-in">
                                <label className="text-[10px] font-black text-slate-400 uppercase">مصاريف الشحن</label>
                                <input type="number" placeholder="أدخل القيمة..." className="w-full p-4 mt-2 bg-slate-50 border rounded-2xl text-xs font-black text-blue-600" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                            </div>
                        )}

                        {/* 4. اختيار العميل و إعدادات التقسيط */}
                        {saleType !== 'cash' && (
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm animate-in fade-in space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">العميل المرتبط</label>
                                        <button onClick={handleAddNewCustomer} className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-1 rounded-lg">+ إضافة عميل جديد</button>
                                    </div>
                                    <select className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                        <option value="">-- اختر من قائمة العملاء المؤهلين --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} (سكور: {c.credit_score})</option>)}
                                    </select>
                                </div>

                                {saleType === 'installment' && (
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">نظام السداد</label>
                                            <select className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-bold" value={instType} onChange={e => setInstType(e.target.value)}>
                                                <option value="monthly">شهري</option>
                                                <option value="daily">يومي</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">قسطك هتدفع كام؟</label>
                                            <input type="number" placeholder={instType === 'monthly' ? "الحد الأدنى 500" : "الحد الأدنى 50"} className="w-full p-4 mt-1 bg-slate-50 border rounded-2xl text-xs font-black text-blue-600" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 5. شاشة قرار X-Core (خاصة بالتقسيط) */}
                        {saleType === 'installment' && selectedCustomer && (
                            <div className={`p-5 rounded-[2rem] border shadow-sm animate-in fade-in ${xCoreValidation?.error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                <h4 className={`text-xs font-black mb-3 flex items-center gap-2 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                    🧠 قرار X-CORE الاستراتيجي
                                </h4>
                                
                                {xCoreValidation?.error ? (
                                    <p className="text-[11px] font-bold text-red-600 leading-relaxed">{xCoreValidation.error}</p>
                                ) : xCoreValidation?.success ? (
                                    <div className="space-y-2 text-[11px] font-bold text-green-800">
                                        <p>✅ {xCoreValidation.msg}</p>
                                        <div className="bg-white p-3 rounded-xl mt-2 border border-green-100 space-y-1">
                                            <div className="flex justify-between"><span>مطلوب تقديمة (كاش):</span><span className="font-black">{xCoreValidation.downPayment.toLocaleString()} ج</span></div>
                                            <div className="flex justify-between"><span>المدة المحسوبة:</span><span className="font-black">{xCoreValidation.calculatedMonths} شهور</span></div>
                                            <div className="flex justify-between"><span>الحد الأقصى المسموح:</span><span className="font-black">{xCoreValidation.maxMonths} شهور</span></div>
                                            <div className="border-t pt-2 mt-2">
                                                <span className="text-slate-500">الضمانات المطلوبة: </span>
                                                <span className="text-red-500 font-black">{xCoreValidation.docs.description}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto"></div></div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* زر الإتمام العائم */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-3 px-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">الإجمالي النهائي للعملية</span>
                            <span className="text-2xl font-black text-blue-600">{finalTotal.toLocaleString()} ج</span>
                        </div>
                        <button 
                            onClick={processSale} 
                            disabled={saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)}
                            className={`w-full max-w-4xl mx-auto block py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${
                                (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                        >
                            تأكيد وإصدار الفاتورة 🖨️
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
