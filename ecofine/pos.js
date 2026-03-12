/**
 * 💻 pos.js - مديول نقطة البيع الذكية (V12.2 Diamond - AI-Powered)
 * تم إصلاح استجابة الشاشات، تثبيت زر التأكيد، وتطوير كروت المنتجات
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const POSModule = ({ currentUser }) => {
    // ==========================================
    // 1. الحالات (States)
    // ==========================================
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [installmentsData, setInstallmentsData] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name'); 
    const [viewMode, setViewMode] = useState('grid'); 

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [saleType, setSaleType] = useState('cash');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [shippingFee, setShippingFee] = useState('');

    const [instType, setInstType] = useState('monthly');
    const [instValue, setInstValue] = useState('');

    const [notification, setNotification] = useState(null);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef(null);
    const scannerContainerRef = useRef(null);

    const [salesStats, setSalesStats] = useState({});

    const getPrice = useCallback((item, type) => {
        if (type === 'installment') return Number(item.installment_price || item.cash_price || item.price || 0);
        return Number(item.cash_price || item.price || 0);
    }, []);

    // ==========================================
    // 2. تحميل البيانات
    // ==========================================
    const loadData = useCallback(async () => {
        try {
            const [p, c, i, cats, invoices] = await Promise.all([
                window.db.getAll('products').catch(() => []),
                window.db.getAll('customers').catch(() => []),
                window.db.getAll('installments').catch(() => []),
                window.db.getAll('categories').catch(() => []),
                window.db.getAll('invoices').catch(() => [])
            ]);
            
            setProducts(p.filter(item => item.stock > 0));
            
            const minScore = window.XConfig?.creditPolicy?.minScoreToEntry || 50;
            setCustomers(c.filter(cust => cust.status === 'active' && cust.credit_score >= minScore));
            
            setInstallmentsData(i);
            setCategories(cats || []);

            const stats = {};
            invoices.forEach(inv => {
                if (inv.items && Array.isArray(inv.items)) {
                    inv.items.forEach(item => {
                        if (item.id) {
                            stats[item.id] = (stats[item.id] || 0) + item.qty;
                        }
                    });
                }
            });
            setSalesStats(stats);
        } catch (error) {
            showNotification('error', '❌ فشل في الاتصال بقاعدة البيانات.');
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
                    showNotification('error', `⚠️ المخزون لا يكفي! المتاح (${product.stock}) فقط.`);
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, { ...product, qty: 1 }];
        });
        setSearchQuery(''); 
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const handleSaleTypeChange = (type) => {
        setSaleType(type);
        if (type === 'cash') {
            setShippingFee('');
            setInstValue('');
            setSelectedCustomer('');
        } else if (type === 'shipping') {
            setInstValue('');
        }
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (getPrice(item, saleType) * item.qty), 0);
    }, [cart, saleType, getPrice]);

    const finalTotal = cartTotal + (saleType === 'shipping' ? Number(shippingFee || 0) : 0);

    // ==========================================
    // 4. الفلترة والفرز
    // ==========================================
    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                (p.barcode && p.barcode.toLowerCase().includes(lowerQuery)) ||
                (p.category_name && p.category_name.toLowerCase().includes(lowerQuery))
            );
        }
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category_id === selectedCategory);
        }
        switch (sortBy) {
            case 'name': result.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
            case 'price_asc': result.sort((a, b) => getPrice(a, saleType) - getPrice(b, saleType)); break;
            case 'price_desc': result.sort((a, b) => getPrice(b, saleType) - getPrice(a, saleType)); break;
            case 'newest': result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
            case 'bestseller': result.sort((a, b) => (salesStats[b.id] || 0) - (salesStats[a.id] || 0)); break;
            default: break;
        }
        return result;
    }, [products, searchQuery, selectedCategory, sortBy, salesStats, saleType, getPrice]);

    // ==========================================
    // 5. محرك فحص إكس كور (X-Core Validator)
    // ==========================================
    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || cartTotal === 0) return null;
        const minInvoice = window.XConfig?.salesTerms?.minInvoiceAmount || 1000;
        if (cartTotal < minInvoice) return { error: `⚠️ الفاتورة أقل من الحد الأدنى (${minInvoice} ج.م)` };
        if (!selectedCustomer) return null;
        if (!window.XCore) return { error: "⚠️ محرك X-Core غير متصل." };

        const customer = customers.find(c => c.id === selectedCustomer);
        if (!customer) return null;

        const customerInsts = installmentsData.filter(i => i.customer_id === selectedCustomer);
        const currentDebt = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

        try {
            const multiCheck = window.XCore.canOpenMultiInvoice(
                customer.credit_score, Number(customer.monthly_income || 0), currentDebt, totalPaid, finalTotal
            );
            if (!multiCheck.can) return { error: multiCheck.msg };
            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط." };

            const terms = window.XCore.calculateSaleTerms(finalTotal, instType, Number(instValue), new Date().getDate());
            if (terms.error) return { error: terms.error };

            return {
                success: true, msg: multiCheck.msg, downPayment: terms.downPayment,
                maxMonths: terms.maxMonths, calculatedMonths: terms.calculatedMonths, docs: terms.docs
            };
        } catch (err) {
            return { error: "❌ خطأ في حسابات المحرك: " + err.message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customers, installmentsData]);

    // ==========================================
    // 6. ماسح الباركود
    // ==========================================
    const loadHtml5QrcodeScript = () => new Promise((resolve, reject) => {
        if (window.Html5Qrcode) return resolve();
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
    });

    const startBarcodeScanner = async () => {
        try {
            await loadHtml5QrcodeScript();
            if (!scannerContainerRef.current) return;
            const html5QrCode = new Html5Qrcode("barcode-scanner-container");
            scannerRef.current = html5QrCode;
            await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
                (decodedText) => handleBarcodeScanned(decodedText), (err) => console.log(err)
            );
        } catch (err) {
            showNotification('error', '❌ تعذر تشغيل الكاميرا.');
            setIsScannerOpen(false);
        }
    };

    const stopBarcodeScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (err) {}
            scannerRef.current = null;
        }
    };

    const handleBarcodeScanned = (barcode) => {
        setSearchQuery(barcode);
        setIsScannerOpen(false);
        const product = products.find(p => p.barcode === barcode);
        if (product) {
            addToCart(product);
            showNotification('success', `✅ تم الإضافة بواسطة الباركود.`);
        } else {
            showNotification('info', `🔍 لم يتم العثور على باركود: ${barcode}`);
        }
    };

    useEffect(() => { isScannerOpen ? startBarcodeScanner() : stopBarcodeScanner(); return () => stopBarcodeScanner(); }, [isScannerOpen]);

    // ==========================================
    // 7. إتمام العملية (Checkout Execution)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ الفاتورة فارغة!');
        if ((saleType === 'shipping' || saleType === 'installment') && !selectedCustomer) return showNotification('error', '⚠️ يرجى اختيار العميل!');
        if (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) return showNotification('error', '🚫 مرفوض من محرك المخاطر.');

        setIsProcessingSale(true);
        try {
            const currentOperator = currentUser?.username || 'النظام';
            const timestamp = new Date().toISOString();

            const invoice = {
                customer_id: selectedCustomer || 'cash_customer', type: saleType,
                items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: getPrice(i, saleType) })),
                subtotal: cartTotal, shipping_fee: Number(shippingFee || 0), total: finalTotal,
                date: timestamp, status: saleType === 'shipping' ? 'pending_delivery' : 'active', cashier: currentOperator
            };
            
            const addedInvoice = await window.db.add('invoices', invoice);
            const insertedId = typeof addedInvoice === 'object' ? (addedInvoice.id || addedInvoice._id) : addedInvoice;
            const invoiceRef = insertedId ? insertedId.toString().slice(0, 8).toUpperCase() : Date.now().toString().slice(-8);

            for (const item of cart) {
                const dbProduct = await window.db.getById('products', item.id);
                if (dbProduct) {
                    await window.db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await window.db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name, type: 'sale', qty: -item.qty, 
                        date: timestamp, note: `مبيعات #${invoiceRef}`, user: currentOperator
                    });
                }
            }

            if (saleType === 'cash' || saleType === 'shipping') {
                await window.db.add('treasury', { type: 'INCOME', amount: finalTotal, description: `مبيعات (${saleType}) #${invoiceRef}`, created_at: timestamp, user: currentOperator });
            } else if (saleType === 'installment') {
                await window.db.add('treasury', { type: 'INCOME', amount: xCoreValidation.downPayment, description: `مقدم تقسيط #${invoiceRef}`, created_at: timestamp, user: currentOperator });
                const actualMonthly = (finalTotal - xCoreValidation.downPayment) / Math.ceil(xCoreValidation.calculatedMonths);
                for (let i = 1; i <= Math.ceil(xCoreValidation.calculatedMonths); i++) {
                    const dueDate = new Date(); dueDate.setMonth(dueDate.getMonth() + i); 
                    await window.db.add('installments', {
                        invoice_id: insertedId, customer_id: selectedCustomer, amount: actualMonthly.toFixed(2),
                        due_date: dueDate.toISOString().split('T')[0], status: 'pending', created_by: currentOperator
                    });
                }
            }

            if (navigator.onLine && typeof window.db.syncWithCloud === 'function') window.db.syncWithCloud();
            
            showNotification('success', '✅ تمت العملية بنجاح!');
            setCart([]); setShippingFee(''); setInstValue(''); setSelectedCustomer(''); setIsCheckoutOpen(false);
            loadData();
        } catch (err) {
            showNotification('error', '❌ خطأ أثناء إصدار الفاتورة.');
        } finally { setIsProcessingSale(false); }
    };

    // ==========================================
    // 8. واجهة المستخدم المحدثة (Responsive UI)
    // ==========================================
    return (
        // تقييد الحاوية الرئيسية لتكون بحجم الشاشة وتمنع التمرير العشوائي للمتصفح (حل مشكلة خروج العناصر)
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative font-sans">
            
            {/* الإشعارات */}
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl text-white font-bold text-sm flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span>{notification.type === 'success' ? '✅' : '⚠️'}</span> {notification.message}
                </div>
            )}

            {/* الهيدر المحكم (ثابت في الأعلى لا يتحرك) */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 z-30 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="flex items-center gap-3 w-full">
                    {/* شريط البحث المدمج بالكاميرا */}
                    <div className="flex-1 flex items-center bg-slate-100/80 rounded-2xl px-3 py-1.5 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                        <span className="text-xl text-slate-400">🔍</span>
                        <input 
                            type="text" placeholder="بحث بالاسم أو الباركود..." 
                            className="w-full py-2 px-3 bg-transparent outline-none text-sm font-bold text-slate-800"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                        <button onClick={() => setIsScannerOpen(true)} className="w-9 h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors">
                            📷
                        </button>
                    </div>

                    {/* أيقونة السلة في الهيدر (تحل مشكلة اختفائها) */}
                    <button onClick={() => setIsCheckoutOpen(true)} className="relative shrink-0 w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">
                        🛒
                        {cart.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                                {cart.reduce((a,b)=>a+b.qty, 0)}
                            </span>
                        )}
                    </button>
                </div>

                {/* أدوات الفلترة والترتيب السريعة */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1 hide-scrollbar">
                    <select className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none min-w-[120px]" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="all">التصنيفات</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <select className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none min-w-[120px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">أبجدياً</option>
                        <option value="price_asc">السعر ⬆</option>
                        <option value="price_desc">السعر ⬇</option>
                        <option value="bestseller">الأكثر مبيعاً</option>
                    </select>
                    <div className="flex bg-slate-100 rounded-xl p-0.5 shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>📱</button>
                        <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>📋</button>
                    </div>
                </div>
            </header>

            {/* منطقة المنتجات المقيدة بالتمرير الداخلي فقط (يمنع المتصفح من التعليق) */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 pb-32">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredAndSortedProducts.map(p => (
                            <button 
                                key={p.id} onClick={() => addToCart(p)} 
                                className="bg-white rounded-3xl p-3 border border-slate-100/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)] hover:border-blue-200 transition-all text-right flex flex-col relative group overflow-hidden"
                            >
                                <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
                                    {p.stock <= 3 && <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">شبه نافذ</span>}
                                    {salesStats[p.id] > 50 && <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">🔥</span>}
                                </div>
                                {/* منطقة الصورة بتصميم مبهر */}
                                <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <span className="text-4xl opacity-50 drop-shadow-sm">📦</span>}
                                </div>
                                <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight mb-3 flex-1">{p.name}</h3>
                                <div className="flex justify-between items-end border-t border-slate-50 pt-2 mt-auto">
                                    <div>
                                        <span className="block text-[8px] text-slate-400 font-bold">السعر</span>
                                        <span className="text-blue-600 font-black text-sm">{getPrice(p, saleType)} <span className="text-[10px]">ج</span></span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[8px] text-slate-400 font-bold">متاح</span>
                                        <span className={`font-black text-xs ${p.stock <= 3 ? 'text-red-500' : 'text-slate-700'}`}>{p.stock}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredAndSortedProducts.map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} className="w-full bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-all">
                                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <span className="text-2xl">📦</span>}
                                </div>
                                <div className="flex-1 text-right">
                                    <h4 className="font-bold text-sm text-slate-800 mb-1">{p.name}</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-600 font-black">{getPrice(p, saleType)} ج</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">المتبقي: {p.stock}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* شريط السلة العائم السريع من الأسفل (مؤمّن داخل الشاشة) */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-slate-900 text-white rounded-[2rem] p-2 pr-4 flex justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-40 border border-slate-700/50 backdrop-blur-md">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">الإجمالي المبدئي</span>
                        <span className="font-black text-xl leading-none">{cartTotal.toLocaleString()} <span className="text-sm text-slate-500 font-normal">ج.م</span></span>
                    </div>
                    <button onClick={() => setIsCheckoutOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-500 transition-colors shadow-inner shadow-white/20">
                        متابعة الدفع ➔
                    </button>
                </div>
            )}

            {/* شاشة الدفع (مبنية كطبقة فوقية مقيدة بـ Flex Box لضمان ظهور الفوتر) */}
            {isCheckoutOpen && (
                <div className="absolute inset-0 z-[9999] bg-slate-50 flex flex-col font-sans animate-in slide-in-from-bottom-8 duration-300">
                    {/* Header الدفع */}
                    <div className="bg-slate-900 text-white px-5 py-4 shrink-0 flex justify-between items-center shadow-md">
                        <div>
                            <h3 className="font-black text-lg">إصدار الفاتورة</h3>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">X-Core Engine Active</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 transition-colors">✕</button>
                    </div>

                    {/* منطقة محتوى الدفع (قابلة للتمرير الداخلي) */}
                    <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 pb-10">
                        <div className="max-w-3xl mx-auto space-y-6">
                            
                            {/* تفاصيل السلة */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span className="text-lg">🧾</span> عناصر الفاتورة
                                </h4>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                                            <div>
                                                <span className="block text-slate-800">{item.name}</span>
                                                <span className="text-[10px] text-slate-500">{item.qty} × {getPrice(item, saleType)} ج</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700 font-black">{(item.qty * getPrice(item, saleType)).toLocaleString()} ج</span>
                                                <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* نوع الفاتورة والإعدادات */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">مسار الدفع</h4>
                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                                    {['cash', 'shipping', 'installment'].map(t => (
                                        <button key={t} onClick={() => handleSaleTypeChange(t)} className={`py-4 rounded-[1rem] text-xs font-black uppercase transition-all flex flex-col items-center gap-1 ${saleType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>
                                            <span className="text-xl">{t === 'cash' ? '💸' : t === 'shipping' ? '🚚' : '📅'}</span>
                                            <span>{t === 'cash' ? 'كاش' : t === 'shipping' ? 'شحن' : 'تقسيط'}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* الإعدادات الديناميكية */}
                                {(saleType !== 'cash' || saleType === 'shipping') && (
                                    <div className="mt-5 space-y-4 pt-5 border-t border-slate-100 animate-in fade-in">
                                        {saleType === 'shipping' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 block mb-1">رسوم الشحن</label>
                                                <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                            </div>
                                        )}
                                        {saleType !== 'cash' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 block mb-1">العميل المُسجل</label>
                                                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                                    <option value="">-- اختر عميلاً --</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} (سكور: {c.credit_score})</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {saleType === 'installment' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 block mb-1">نظام الدفع</label>
                                                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={instType} onChange={e => setInstType(e.target.value)}>
                                                        <option value="monthly">شهري</option><option value="daily">يومي</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 block mb-1">قيمة القسط</label>
                                                    <input type="number" className="w-full p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold outline-none" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* تقرير X-Core للتقسيط */}
                            {saleType === 'installment' && (
                                <div className={`p-5 rounded-3xl border shadow-sm ${xCoreValidation?.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                    <h4 className={`text-xs font-black mb-3 flex items-center gap-2 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                        <span className="text-xl">🧠</span> تقرير المخاطر الآلي
                                    </h4>
                                    {xCoreValidation?.error ? (
                                        <p className="text-sm font-bold text-red-700">{xCoreValidation.error}</p>
                                    ) : xCoreValidation?.success ? (
                                        <div className="space-y-3 text-xs font-bold text-green-900">
                                            <p className="bg-white/80 p-3 rounded-xl">{xCoreValidation.msg}</p>
                                            <div className="bg-white p-4 rounded-2xl flex justify-between">
                                                <span>المقدم المطلوب:</span> <span className="font-black text-lg">{xCoreValidation.downPayment.toLocaleString()} ج</span>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl flex justify-between">
                                                <span>عدد الأشهر:</span> <span className="font-black text-blue-600">{xCoreValidation.calculatedMonths} شهر</span>
                                            </div>
                                        </div>
                                    ) : <div className="text-center py-4"><span className="animate-pulse">جاري فحص البيانات...</span></div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* الفوتر الثابت لشاشة الدفع (مؤمن ومثبت بفضل shrink-0 مع مساحة أمان pb-6) */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-4 pb-6 md:p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] z-50">
                        <div className="max-w-3xl mx-auto flex items-center gap-4">
                            <div className="shrink-0 text-right pr-2 border-l border-slate-200 pl-4">
                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">المطلوب سداده</span>
                                <span className="font-black text-2xl text-blue-600 leading-none">{finalTotal.toLocaleString()} <span className="text-sm">ج</span></span>
                            </div>
                            <button 
                                onClick={processSale} 
                                disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                                className={`flex-1 py-4 rounded-2xl font-black text-base shadow-lg transition-all flex justify-center items-center gap-2 ${
                                    (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                            >
                                {isProcessingSale ? <span className="animate-pulse text-sm">⏳ جاري الإصدار...</span> : <>🖨️ تأكيد وإصدار الفاتورة</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* نافذة ماسح الباركود المقيدة */}
            {isScannerOpen && (
                <div className="absolute inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
                        <div className="p-4 flex justify-between items-center bg-slate-800 text-white">
                            <h3 className="font-bold text-sm">مسح الباركود</h3>
                            <button onClick={() => setIsScannerOpen(false)} className="bg-red-500/20 text-red-500 w-8 h-8 rounded-lg flex items-center justify-center">✕</button>
                        </div>
                        <div id="barcode-scanner-container" ref={scannerContainerRef} className="w-full h-72 bg-black"></div>
                        <div className="p-3 text-center text-xs text-slate-400">وجه الكاميرا نحو المنتج</div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
