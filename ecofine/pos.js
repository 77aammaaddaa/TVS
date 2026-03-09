// pos.js - مديول نقطة البيع المتكاملة (Cash, Shipping, Installment)

const POSModule = () => {
    const [customers, setCustomers] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [cart, setCart] = React.useState([]);
    const [saleType, setSaleType] = React.useState('cash'); // cash, shipping, installment
    const [selectedCustomer, setSelectedCustomer] = React.useState('');
    const [shippingFee, setShippingFee] = React.useState(0);
    const [installmentsCount, setInstallmentsCount] = React.useState(12);

    const loadData = async () => {
        const [c, p] = await Promise.all([db.getAll('customers'), db.getAll('products')]);
        setCustomers(c || []);
        setProducts(p.filter(item => item.stock > 0) || []); // عرض المتاح فقط
    };

    React.useEffect(() => { loadData(); }, []);

    // 1. إدارة السلة (Cart Management)
    const addToCart = (product) => {
        const exists = cart.find(item => item.id === product.id);
        if (exists) {
            setCart(cart.map(item => item.id === product.id ? {...item, qty: item.qty + 1} : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

    // 2. الحسابات المالية
    const subTotal = cart.reduce((sum, item) => {
        const price = saleType === 'installment' ? item.installment_price : item.cash_price;
        return sum + (price * item.qty);
    }, 0);

    const finalTotal = subTotal + (saleType === 'shipping' ? Number(shippingFee) : 0);

    // 3. تنفيذ عملية البيع (The Big Execution)
    const processSale = async () => {
        if (!selectedCustomer) return alert("⚠️ برجاء اختيار العميل أولاً");
        if (cart.length === 0) return alert("⚠️ السلة فارغة");

        try {
            // أ) تسجيل الفاتورة الرئيسية
            const invoice = await db.add('invoices', {
                customer_id: selectedCustomer,
                type: saleType,
                items: cart,
                subtotal: subTotal,
                shipping_fee: shippingFee,
                total: finalTotal,
                date: new Date().toISOString(),
                status: saleType === 'shipping' ? 'pending_delivery' : 'completed'
            });

            // ب) تحديث المخزن وتسجيل السجل (Logs) لكل منتج في السلة
            for (const item of cart) {
                await db.update('products', item.id, { stock: item.stock - item.qty });
                await db.add('inventory_logs', {
                    product_id: item.id, product_name: item.name,
                    type: 'sale', qty: -item.qty, date: new Date().toISOString()
                });
            }

            // ج) المعالجة المالية حسب النوع
            if (saleType === 'cash' || saleType === 'shipping') {
                // دخول فوري للخزينة (الكاش أو قيمة الأوردر عند الشحن)
                await db.add('treasury_log', {
                    type: 'in', amount: finalTotal, reason: `بيع فاتورة ${invoice.id}`, date: new Date().toISOString()
                });
            } else if (saleType === 'installment') {
                // توليد الأقساط آلياً (محرك XCore)
                const monthly = finalTotal / installmentsCount;
                for (let i = 1; i <= installmentsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i);
                    await db.add('installments', {
                        invoice_id: invoice.id,
                        customer_id: selectedCustomer,
                        amount: monthly,
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending'
                    });
                }
            }

            alert("✅ تمت العملية بنجاح! جاري تجهيز الفاتورة...");
            setCart([]);
            loadData();
        } catch (err) { alert("❌ فشل في إتمام العملية"); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
            
            {/* الجزء الأيمن: اختيار المنتجات */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-4 rounded-3xl border shadow-sm">
                    <input type="text" placeholder="ابحث عن منتج..." className="w-full p-3 bg-slate-50 border rounded-2xl outline-none" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-3xl border hover:border-blue-500 transition-all text-right shadow-sm active:scale-95">
                            <p className="font-black text-slate-800 text-xs truncate">{p.name}</p>
                            <p className="text-blue-600 font-black text-sm mt-1">{saleType === 'installment' ? p.installment_price : p.cash_price} ج</p>
                            <p className="text-[9px] text-slate-400 mt-1">المتاح: {p.stock}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* الجزء الأيسر: سلة المشتريات والإنهاء */}
            <div className="space-y-4">
                <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl sticky top-20">
                    <h3 className="font-black mb-4 flex items-center gap-2">🛒 سلة العمليات</h3>
                    
                    {/* اختيار العميل */}
                    <select className="w-full p-3 bg-slate-800 rounded-2xl mb-4 text-xs font-bold border-none" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                        <option value="">اختر العميل...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>

                    {/* نوع البيع */}
                    <div className="grid grid-cols-3 gap-1 mb-4 bg-slate-800 p-1 rounded-2xl">
                        {['cash', 'shipping', 'installment'].map(t => (
                            <button key={t} onClick={() => setSaleType(t)} className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all ${saleType === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                                {t === 'cash' ? 'كاش' : t === 'shipping' ? 'شحن' : 'تقسيط'}
                            </button>
                        ))}
                    </div>

                    {/* قائمة المنتجات في السلة */}
                    <div className="space-y-3 max-h-48 overflow-y-auto mb-4 custom-scroll pr-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                                <span>{item.qty}x {item.name}</span>
                                <button onClick={() => removeFromCart(item.id)} className="text-red-400">✕</button>
                            </div>
                        ))}
                    </div>

                    {/* إعدادات إضافية بناءً على النوع */}
                    {saleType === 'shipping' && (
                        <input type="number" placeholder="مصاريف الشحن" className="w-full p-3 bg-slate-800 rounded-xl mb-4 text-xs" onChange={e => setShippingFee(e.target.value)} />
                    )}
                    {saleType === 'installment' && (
                        <select className="w-full p-3 bg-slate-800 rounded-xl mb-4 text-xs" onChange={e => setInstallmentsCount(e.target.value)}>
                            <option value="6">على 6 شهور</option>
                            <option value="12" selected>على 12 شهر</option>
                            <option value="24">على 24 شهر</option>
                        </select>
                    )}

                    {/* المجموع والإنهاء */}
                    <div className="border-t border-slate-800 pt-4 space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>المجموع الفرعي:</span>
                            <span>{subTotal.toLocaleString()} ج</span>
                        </div>
                        <div className="flex justify-between text-lg font-black">
                            <span>الإجمالي:</span>
                            <span className="text-green-400">{finalTotal.toLocaleString()} ج</span>
                        </div>
                        <button onClick={processSale} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black mt-4 shadow-xl transition-all active:scale-95">
                            إتمام العملية وتوليد العقد 🚀
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

window.POSModule = POSModule;
