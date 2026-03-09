/**
 * 💻 pos.js - مديول نقطة البيع الذكية (V10.0 Platinum - X-Core Integrated)
 * واجهة الهاتف المحمول (Full-Screen Native Fix) لدعم البيع (كاش، شحن، تقسيط)
 * يطبق حسابات الشريعة، السقف الائتماني، والمخاطر لحظياً مع واجهة منيعة ضد انهيار الكيبورد.
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
    const [instValue, setInstValue] = useState(''); 
    
    // حالة الإشعارات والتحميل
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
            setProducts(p.filter(item => item.stock > 0)); 
            
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
                    showNotification('error', `⚠️ الكمية تتخطى المتاح (${product.stock})!`);
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));
    
    // إعادة ضبط الحقول عند تغيير نوع البيع
    const handleSaleTypeChange = (type) => {
        setSaleType(type);
        if (type === 'cash') {
            setShippingFee('');
            setInstValue('');
        } else if (type === 'shipping') {
            setInstValue('');
        }
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + ((saleType === 'installment' ? item.installment_price : item.cash_price) * item.qty), 0);
    }, [cart, saleType]);

    const finalTotal = cartTotal + (saleType === 'shipping' ? Number(shippingFee || 0) : 0);

    // ==========================================
    // 4. محرك فحص إكس كور (X-Core Validator)
    // ==========================================
    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || cartTotal === 0) return null;
        
        const minInvoice = window.XConfig?.salesTerms?.minInvoiceAmount || 1000;
        if (cartTotal < minInvoice) {
            return { error: `⚠️ الفاتورة أقل من الحد الأدنى للتقسيط (${minInvoice} ج.م)` };
        }

        if (!selectedCustomer) return null;
        
        // Fallback in case XCore is not injected yet during testing
        if (!window.XCore) {
            return { error: "⚠️ محرك X-Core الاستراتيجي غير متصل حالياً." };
        }

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return null;

        const customerInsts = installmentsData.filter(i => i.customer_id === selectedCustomer);
        const currentDebt = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

        try {
            const multiCheck = window.XCore.canOpenMultiInvoice(
                customer.credit_score, 
                Number(customer.monthly_income || 0), 
                currentDebt, 
                totalPaid, 
                finalTotal
            );

            if (!multiCheck.can) return { error: multiCheck.msg };

            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط المطلوب لحساب المدة." };

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
            return { error: "❌ خطأ في حسابات المحرك: " + err.message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customers, installmentsData]);

    // ==========================================
    // 5. إتمام العملية (Execution)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ السلة فارغة!');
        
        // الشحن والتقسيط يتطلبان اختيار عميل مسجل
        if ((saleType === 'shipping' || saleType === 'installment') && !selectedCustomer) {
            return showNotification('error', '⚠️ يرجى اختيار العميل لتسجيل الفاتورة باسمه!');
        }

        if (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) {
            return showNotification('error', '🚫 لا يمكن الإتمام: العملية مرفوضة من X-Core.');
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

            // 2. خصم المخزون وتسجيل حركة الجرد
            for (const item of cart) {
                const dbProduct = await db.getById('products', item.id);
                if (dbProduct) {
                    await db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name,
                        type: 'sale', qty: -item.qty, date: new Date().toISOString(), note: `مبيعات فاتورة ${addedInvoice.id.slice(0,6)}`
                    });
                }
            }

            // 3. المعالجة المالية (الخزينة)
            if (saleType === 'cash' || saleType === 'shipping') {
                await db.add('treasury', {
                    type: 'INCOME', amount: finalTotal, description: `مبيعات (${saleType}) فاتورة: ${addedInvoice.id.slice(0,6)}`, created_at: new Date().toISOString()
                });
            } else if (saleType === 'installment') {
                // تسجيل المقدم
                await db.add('treasury', {
                    type: 'INCOME', amount: xCoreValidation.downPayment, 
                    description: `مقدم تقسيط فاتورة: ${addedInvoice.id.slice(0,6)}`, created_at: new Date().toISOString()
                });

                // توليد الأقساط
                const remainingAmount = finalTotal - xCoreValidation.downPayment;
                const monthsCount = Math.ceil(xCoreValidation.calculatedMonths);
                const actualMonthly = remainingAmount / monthsCount;

                for (let i = 1; i <= monthsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i); 
                    await db.add('installments', {
                        invoice_id: addedInvoice.id,
                        customer_id: selectedCustomer,
                        amount: actualMonthly.toFixed(2),
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending'
                    });
                }
            }

            if (navigator.onLine && db.syncWithCloud) db.syncWithCloud();

            showNotification('success', '✅ تم إتمام العملية وتحديث الخزينة والمخزن!');
            setCart([]);
            setShippingFee('');
            setInstValue('');
            setSelectedCustomer('');
            setIsCheckoutOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
            showNotification('error', '❌ حدث خطأ داخلي أثناء الحفظ.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative pb-32 animate-in fade-in">
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-6 py-3 rounded-[2rem] shadow-2xl text-white font-black text-xs transition-all duration-300 ${notification.type === 'success' ? 'bg-green-600 shadow-green-500/30' : 'bg-red-600 shadow-red-500/30'}`}>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث */}
            <div className="bg-white p-4 rounded-[2rem] border shadow-sm mb-4 sticky top-0 z-10 flex gap-2 items-center mx-2 mt-2">
                <span className="text-xl pl-2">🔍</span>
                <input type="text" placeholder="ابحث عن منتج بالاسم أو الباركود..." className="w-full bg-transparent outline-none text-xs font-bold text-slate-800" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            
            {/* معرض المنتجات */}
            <div className="flex-1 overflow-y-auto custom-scroll px-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-[2rem] border border-slate-100 hover:border-blue-500 transition-all text-right shadow-sm active:scale-95 flex flex-col justify-between h-36 relative overflow-hidden group">
                            {p.stock <= 3 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl z-10 animate-pulse">شحيح</span>}
                            <p className="font-black text-slate-800 text-xs line-clamp-2 leading-relaxed relative z-10">{p.name}</p>
                            <div className="relative z-10">
                                <p className="text-blue-600 font-black text-sm">{saleType === 'installment' ? p.installment_price : p.cash_price} <span className="text-[10px] text-slate-400">ج</span></p>
                                <p className="text-[9px] text-slate-500 font-bold mt-1 bg-slate-50 px-2 py-1 rounded-lg inline-block">المتاح: <span className="text-slate-900">{p.stock}</span></p>
                            </div>
                        </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed">
                            <span className="text-4xl mb-3 opacity-50">📦</span>
                            <p className="text-slate-400 font-bold text-xs uppercase">لا توجد منتجات تطابق بحثك</p>
                        </div>
                    )}
                </div>
            </div>

            {/* زر السلة العائم */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-slate-900 text-white p-4 rounded-[2rem] shadow-2xl z-40 flex justify-between items-center cursor-pointer active:scale-95 transition-transform" onClick={() => setIsCheckoutOpen(true)}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-black text-lg">{cart.reduce((s, i)=>s+i.qty, 0)}</div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">الإجمالي المبدئي</p>
                            <p className="font-black text-xl leading-none mt-1">{cartTotal.toLocaleString()} <span className="text-xs font-normal opacity-50">ج</span></p>
                        </div>
                    </div>
                    <button className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs shadow-md">الدفع ➔</button>
                </div>
            )}

            {/* 🚀 شاشة الدفع (Full-Screen 100dvh Native Fix) */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-50 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    
                    {/* الهيدر الثابت */}
                    <div className="h-20 shrink-0 bg-slate-900 px-6 text-white flex justify-between items-center shadow-md z-50 rounded-b-3xl">
                        <div>
                            <h3 className="font-black text-lg">خزينة الدفع</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">X-Core Engine</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-white/20">✕</button>
                    </div>

                    {/* منطقة التمرير (لا تتأثر بالكيبورد) */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full">
                        <div className="p-4 space-y-4 pb-10 max-w-2xl mx-auto">
                            
                            {/* 1. السلة */}
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b pb-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المنتجات ({cart.length})</h4>
                                </div>
                                <div className="space-y-3">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-xs font-bold border-b border-slate-50 pb-3">
                                            <div className="flex flex-col pr-2">
                                                <span className="text-slate-800 line-clamp-1">{item.name}</span>
                                                <span className="text-[10px] text-slate-400 mt-1">الكمية: {item.qty} × {saleType === 'installment' ? item.installment_price : item.cash_price}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-blue-600 font-black">{(item.qty * (saleType === 'installment' ? item.installment_price : item.cash_price)).toLocaleString()} ج</span>
                                                <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. نوع البيع */}
                            <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">مسار العملية</h4>
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl">
                                    {['cash', 'shipping', 'installment'].map(t => (
                                        <button key={t} onClick={() => handleSaleTypeChange(t)} className={`py-4 rounded-[1rem] text-[10px] font-black uppercase transition-all ${saleType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                            {t === 'cash' ? 'كاش 💸' : t === 'shipping' ? 'توصيل 🚚' : 'تقسيط 📅'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. الإعدادات الديناميكية */}
                            {(saleType !== 'cash' || saleType === 'shipping') && (
                                <div className="bg-white p-5 rounded-[2rem] border shadow-sm space-y-4 animate-in fade-in">
                                    
                                    {saleType === 'shipping' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">مصاريف الشحن</label>
                                            <input type="number" placeholder="أدخل القيمة..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                        </div>
                                    )}

                                    {saleType !== 'cash' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase">العميل (إجباري)</label>
                                            </div>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none appearance-none focus:ring-2 focus:ring-blue-500" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                                <option value="">-- اختر العميل من القائمة --</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {saleType === 'installment' && (
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">دورة السداد</label>
                                                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none appearance-none" value={instType} onChange={e => setInstType(e.target.value)}>
                                                    <option value="monthly">شهري 📅</option>
                                                    <option value="daily">يومي ⏳</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">قيمة القسط المُراد</label>
                                                <input type="number" placeholder="القيمة..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 4. قرار X-Core للتقسيط */}
                            {saleType === 'installment' && (
                                <div className={`p-5 rounded-[2rem] border shadow-sm animate-in fade-in ${xCoreValidation?.error ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-200'}`}>
                                    <h4 className={`text-xs font-black mb-3 flex items-center gap-2 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>🧠 قرار X-CORE الاستراتيجي</h4>
                                    
                                    {xCoreValidation?.error ? (
                                        <p className="text-xs font-black text-red-600 bg-white/60 p-3 rounded-xl border border-red-100">{xCoreValidation.error}</p>
                                    ) : xCoreValidation?.success ? (
                                        <div className="space-y-3 text-xs font-bold text-green-900">
                                            <p className="bg-white/60 p-3 rounded-xl border border-green-200">✅ {xCoreValidation.msg}</p>
                                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100 space-y-2">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black">مطلوب مقدم (كاش)</span>
                                                    <span className="font-black text-lg">{xCoreValidation.downPayment.toLocaleString()} ج</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black">المدة المحسوبة</span>
                                                    <span className="font-black">{xCoreValidation.calculatedMonths} شهور</span>
                                                </div>
                                                <div className="bg-red-50 p-3 rounded-xl mt-3 border border-red-100">
                                                    <span className="block text-[9px] font-black text-red-400 uppercase mb-1">الضمانات القانونية</span>
                                                    <span className="text-[10px] text-red-700 font-black">{xCoreValidation.docs.description}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-white/50 rounded-2xl"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div></div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* الفوتر الثابت السُفلي */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-8 z-50">
                        <div className="flex justify-between items-end mb-4 px-2 max-w-2xl mx-auto">
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الإجمالي المطلوب</span>
                                <span className="text-xs font-black text-slate-600">{cart.length} منتج</span>
                            </div>
                            <span className="text-3xl font-black text-blue-600 leading-none">{finalTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></span>
                        </div>
                        <button 
                            onClick={processSale} 
                            disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                            className={`w-full max-w-2xl mx-auto py-4 rounded-[1.5rem] font-black text-sm shadow-xl transition-all active:scale-95 block ${
                                (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-slate-900 text-white'
                            }`}
                        >
                            {isProcessingSale ? 'جاري إصدار الفاتورة...' : 'تأكيد العملية الدفع 🖨️'}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
