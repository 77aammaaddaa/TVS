/**
 * 💻 pos.js - مديول نقطة البيع الذكية (V8.5 Turbo - X-Core Integrated)
 * واجهة الهاتف المحمول (Native Feel) لدعم البيع (كاش، شحن، تقسيط)
 * يطبق حسابات الشريعة، السقف الائتماني، والمخاطر لحظياً مع ربط كامل بـ XConfig.
 */

const { useState, useEffect, useMemo, useCallback } = React;

const POSModule = () => {
    // ==========================================
    // 1. الحالات (States)
    // ==========================================
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [installmentsData, setInstallmentsData] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // حالات الدفع (Checkout)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [saleType, setSaleType] = useState('cash'); // cash, shipping, installment
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [shippingFee, setShippingFee] = useState('');
    
    // حالات التقسيط الخاصة بـ X-Core
    const [instType, setInstType] = useState('monthly'); // daily, monthly
    const [instValue, setInstValue] = useState(''); // قيمة القسط المستهدف
    
    // حالة الإشعارات
    const [notification, setNotification] = useState(null);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

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
            setProducts(p.filter(item => item.stock > 0)); // المتاح فقط في المخزن
            // جلب الحد الأدنى للسكور من الإعدادات أو افتراضي 50
            const minScore = window.XConfig?.creditPolicy?.minScoreToEntry || 50;
            setCustomers(c.filter(cust => cust.status === 'active' && cust.credit_score >= minScore));
            setInstallmentsData(i);
        } catch (error) {
            showNotification('error', '❌ فشل في تحميل بيانات المخزن والعملاء.');
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
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.includes(searchQuery) || (p.barcode && p.barcode.includes(searchQuery)));
    }, [products, searchQuery]);

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                if (exists.qty >= product.stock) {
                    showNotification('error', `⚠️ الكمية المطلوبة تتخطى المخزون المتاح (${product.stock})!`);
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
        if (saleType !== 'installment' || cartTotal === 0) return null;
        
        // فحص الحد الأدنى للفاتورة من الإعدادات
        const minInvoice = window.XConfig?.salesTerms?.minInvoiceAmount || 2500;
        if (cartTotal < minInvoice) {
            return { error: `⚠️ لا يمكن التقسيط: إجمالي الفاتورة أقل من الحد الأدنى (${minInvoice} ج.م)` };
        }

        if (!selectedCustomer) return null;
        if (!window.XCore) return { error: "⚠️ محرك X-Core غير متصل. يرجى مراجعة الدعم الفني." };

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return null;

        // أ) حساب المديونية الحالية للعميل
        const customerInsts = installmentsData.filter(i => i.customer_id === selectedCustomer);
        const currentDebt = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

        // ب) فحص تعدد الفواتير والسقف الائتماني
        try {
            const multiCheck = window.XCore.canOpenMultiInvoice(
                customer.credit_score, 
                Number(customer.monthly_income || 0), 
                currentDebt, 
                totalPaid, 
                finalTotal
            );

            if (!multiCheck.can) return { error: multiCheck.msg };

            // ج) فحص الشروط المالية والشرعية
            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط المطلوب لحساب التقديمة والمدة." };

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
        } catch (err) {
            return { error: "❌ حدث خطأ في محرك الحسابات: " + err.message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customers, installmentsData]);

    // ==========================================
    // 5. إتمام العملية (The Execution)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ السلة فارغة!');
        if (!selectedCustomer && saleType !== 'cash') return showNotification('error', '⚠️ يرجى اختيار العميل أولاً!');
        if (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) {
            return showNotification('error', '🚫 لا يمكن الإتمام: العملية لم تجتز شروط X-Core.');
        }

        setIsProcessingSale(true);
        try {
            // 1. إنشاء الفاتورة
            const invoice = {
                customer_id: selectedCustomer || 'cash_customer',
                type: saleType,
                items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: saleType === 'installment' ? i.installment_price : i.cash_price })),
                subtotal: cartTotal,
                shipping_fee: Number(shippingFee || 0),
                total: finalTotal,
                date: new Date().toISOString(),
                status: saleType === 'shipping' ? 'pending_delivery' : 'active'
            };
            const addedInvoice = await db.add('invoices', invoice);

            // 2. خصم المخزون وتسجيل الحركة
            for (const item of cart) {
                // جلب الكمية الحالية لتجنب أخطاء المزامنة
                const dbProduct = await db.getById('products', item.id);
                if (dbProduct) {
                    await db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name,
                        type: 'sale', qty: -item.qty, date: new Date().toISOString()
                    });
                }
            }

            // 3. المعالجة المالية المتقدمة
            if (saleType === 'cash' || saleType === 'shipping') {
                await db.add('treasury', {
                    type: 'INCOME', amount: finalTotal, description: `مبيعات فاتورة (${saleType}): ${addedInvoice.id.slice(0,8)}`, created_at: new Date().toISOString()
                });
            } else if (saleType === 'installment') {
                // تسجيل التقديمة في الخزينة
                await db.add('treasury', {
                    type: 'INCOME', amount: xCoreValidation.downPayment, 
                    description: `مقدم فاتورة تقسيط للعميل: ${addedInvoice.id.slice(0,8)}`, created_at: new Date().toISOString()
                });

                // توليد الأقساط الباقية آلياً
                const remainingAmount = finalTotal - xCoreValidation.downPayment;
                const monthsCount = Math.ceil(xCoreValidation.calculatedMonths);
                const actualMonthly = remainingAmount / monthsCount;

                for (let i = 1; i <= monthsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i); 
                    
                    await db.add('installments', {
                        invoice_id: addedInvoice.id,
                        customer_id: selectedCustomer,
                        amount: actualMonthly.toFixed(2), // تقريب لرقمين عشريين
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending'
                    });
                }
            }

            // إذا كان النظام متصلاً، افرض مزامنة فورية
            if (navigator.onLine && db.syncUnsyncedData) {
                db.syncUnsyncedData();
            }

            showNotification('success', '✅ تم إتمام العملية وتوليد العقود وتحديث الخزينة بنجاح!');
            setCart([]);
            setShippingFee('');
            setInstValue('');
            setIsCheckoutOpen(false);
            loadData(); // إعادة تحميل المنتجات بالكميات الجديدة
        } catch (err) {
            console.error(err);
            showNotification('error', '❌ حدث خطأ داخلي أثناء حفظ العملية.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    const handleAddNewCustomer = () => {
        alert("💡 لإضافة عميل جديد وضامنيه للتقييم الصحيح، يرجى استخدام موديول (العملاء والضامنين) من القائمة الجانبية.");
        setIsCheckoutOpen(false);
    };

    return (
        <div className="h-full flex flex-col relative pb-24 animate-in fade-in">
            {/* إشعارات النظام الطافية */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-[2rem] shadow-2xl text-white font-black text-xs md:text-sm transition-all duration-300 ${
                    notification.type === 'success' ? 'bg-green-600 shadow-green-500/30' : 'bg-red-600 shadow-red-500/30'
                }`}>
                    {notification.message}
                </div>
            )}

            {/* الجزء العلوي: شريط البحث */}
            <div className="bg-white p-4 rounded-[2rem] border shadow-sm mb-4 sticky top-0 z-10 flex gap-2 items-center">
                <span className="text-xl pl-2">🔍</span>
                <input 
                    type="text" 
                    placeholder="ابحث عن منتج (باركود / اسم)..." 
                    className="w-full bg-transparent outline-none text-xs font-bold text-slate-800"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            {/* معرض المنتجات (Grid) */}
            <div className="flex-1 overflow-y-auto custom-scroll pr-1 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-[2rem] border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-right shadow-sm active:scale-95 flex flex-col justify-between h-36 relative overflow-hidden group">
                            {p.stock <= 3 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl z-10 animate-pulse">شحيح</span>}
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <p className="font-black text-slate-800 text-xs line-clamp-2 leading-relaxed relative z-10">{p.name}</p>
                            <div className="relative z-10">
                                <p className="text-blue-600 font-black text-sm">{saleType === 'installment' ? p.installment_price : p.cash_price} <span className="text-[10px] text-slate-400">ج.م</span></p>
                                <p className="text-[9px] text-slate-500 font-bold mt-1 bg-slate-50 px-2 py-1 rounded-lg inline-block">المتاح: <span className="text-slate-900">{p.stock}</span></p>
                            </div>
                        </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                            <span className="text-4xl mb-3 opacity-50">📦</span>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">لا توجد منتجات تطابق بحثك</p>
                        </div>
                    )}
                </div>
            </div>

            {/* الشريط السفلي العائم للตะلة (Floating Mini Cart) */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-slate-900 text-white p-4 rounded-[2rem] shadow-2xl z-40 flex justify-between items-center cursor-pointer active:scale-95 transition-transform hover:shadow-blue-900/20 border border-slate-700" onClick={() => setIsCheckoutOpen(true)}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-black text-lg shadow-inner">{cart.reduce((s, i)=>s+i.qty, 0)}</div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">الإجمالي المبدئي</p>
                            <p className="font-black text-xl leading-none mt-1">{cartTotal.toLocaleString()} <span className="text-xs font-normal opacity-50">ج.م</span></p>
                        </div>
                    </div>
                    <button className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs shadow-md">الدفع ➔</button>
                </div>
            )}

            {/* 💳 نافذة الدفع الكاملة (Full-Screen Checkout Modal) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                    
                    {/* هيدر النافذة */}
                    <div className="bg-slate-900 p-6 pt-8 text-white shrink-0 flex justify-between items-center shadow-lg relative z-20 rounded-b-[2.5rem]">
                        <div>
                            <h3 className="font-black text-xl">خزينة الدفع (Checkout)</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1">نظام X-Core الآمن</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-white/20 transition-colors">✕</button>
                    </div>

                    {/* منطقة التمرير (المحتوى) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll pb-40">
                        
                        {/* 1. مسار العملية (نوع البيع) */}
                        <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">1. تحديد مسار العملية</h4>
                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                {['cash', 'shipping', 'installment'].map(t => (
                                    <button key={t} onClick={() => setSaleType(t)} className={`py-4 rounded-[1rem] text-[10px] font-black uppercase transition-all ${saleType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                        {t === 'cash' ? 'كاش فوري 💸' : t === 'shipping' ? 'توصيل 🚚' : 'تقسيط 📅'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. قائمة المشتريات (السلة) */}
                        <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                            <div className="flex justify-between items-center mb-4 border-b pb-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. المنتجات المختارة</h4>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">{cart.length} أصناف</span>
                            </div>
                            <div className="space-y-3 max-h-48 overflow-y-auto custom-scroll pr-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-800 line-clamp-1">{item.name}</span>
                                            <span className="text-[10px] text-slate-400 mt-1">الكمية: {item.qty} × {saleType === 'installment' ? item.installment_price : item.cash_price} ج</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-blue-600 font-black text-sm">{(item.qty * (saleType === 'installment' ? item.installment_price : item.cash_price)).toLocaleString()}</span>
                                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 3. الإعدادات الشرطية (شحن أو عميل) */}
                        {(saleType === 'shipping' || saleType !== 'cash') && (
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm animate-in fade-in space-y-5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">3. إعدادات العملية</h4>
                                
                                {saleType === 'shipping' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase">مصاريف الشحن والتوصيل</label>
                                        <input type="number" placeholder="أدخل القيمة (ج.م)..." className="w-full p-4 mt-2 bg-slate-50 border rounded-2xl text-xs font-black outline-none focus:border-blue-500" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                    </div>
                                )}

                                {saleType !== 'cash' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase">العميل المرتبط بالفاتورة</label>
                                            <button onClick={handleAddNewCustomer} className="text-[10px] text-blue-600 font-black bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100">+ عميل جديد</button>
                                        </div>
                                        <select className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:border-blue-500 appearance-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                            <option value="">-- اضغط لاختيار العميل --</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} (سكور: {c.credit_score})</option>)}
                                        </select>
                                    </div>
                                )}

                                {saleType === 'installment' && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase">دورة السداد</label>
                                            <select className="w-full p-4 mt-2 bg-slate-50 border rounded-2xl text-xs font-black outline-none appearance-none" value={instType} onChange={e => setInstType(e.target.value)}>
                                                <option value="monthly">شهري 📅</option>
                                                <option value="daily">يومي ⏳</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase">قسطك هتدفع كام؟</label>
                                            <input type="number" placeholder="القيمة..." className="w-full p-4 mt-2 bg-slate-50 border rounded-2xl text-xs font-black text-blue-600 outline-none focus:border-blue-500" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 4. شاشة قرار X-Core (خاصة بالتقسيط) */}
                        {saleType === 'installment' && (
                            <div className={`p-6 rounded-[2.5rem] border shadow-sm animate-in fade-in transition-colors ${xCoreValidation?.error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-200'}`}>
                                <h4 className={`text-xs font-black mb-4 flex items-center gap-2 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                    🧠 قرار X-CORE الاستراتيجي
                                </h4>
                                
                                {xCoreValidation?.error ? (
                                    <div className="bg-white/60 p-4 rounded-2xl border border-red-200">
                                        <p className="text-xs font-black text-red-600 leading-relaxed">{xCoreValidation.error}</p>
                                    </div>
                                ) : xCoreValidation?.success ? (
                                    <div className="space-y-3 text-xs font-bold text-green-900">
                                        <p className="bg-white/60 p-3 rounded-xl border border-green-200">✅ {xCoreValidation.msg}</p>
                                        <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-green-100 space-y-3">
                                            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                <span className="text-[10px] text-slate-500 uppercase font-black">مطلوب مقدم (كاش)</span>
                                                <span className="font-black text-lg text-slate-800">{xCoreValidation.downPayment.toLocaleString()} <span className="text-xs">ج.م</span></span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                <span className="text-[10px] text-slate-500 uppercase font-black">المدة المحسوبة</span>
                                                <span className="font-black text-slate-800">{xCoreValidation.calculatedMonths} <span className="text-[10px]">شهور</span></span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-500 uppercase font-black">الحد الأقصى</span>
                                                <span className="font-black text-slate-800">{xCoreValidation.maxMonths} <span className="text-[10px]">شهور</span></span>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded-xl mt-3 flex items-start gap-2 border border-red-100">
                                                <span>⚠️</span>
                                                <div>
                                                    <span className="block text-[9px] font-black text-red-400 uppercase">الضمانات القانونية المطلوبة</span>
                                                    <span className="text-[11px] text-red-700 font-black">{xCoreValidation.docs.description}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-white/50 rounded-2xl">
                                        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-2"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">في انتظار إكمال البيانات...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* زر الإتمام العائم (Bottom Fixed Bar) */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-5 z-30 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] rounded-t-[2.5rem]">
                        <div className="flex justify-between items-end mb-4 px-2">
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الإجمالي النهائي</span>
                                <span className="text-sm font-black text-slate-600">{cart.length} منتج</span>
                            </div>
                            <span className="text-3xl font-black text-blue-600 leading-none">{finalTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></span>
                        </div>
                        <button 
                            onClick={processSale} 
                            disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                            className={`w-full max-w-2xl mx-auto flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm shadow-2xl transition-all active:scale-95 ${
                                (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                        >
                            {isProcessingSale ? (
                                <span className="animate-pulse">جاري إصدار الفاتورة...</span>
                            ) :
