/**
 * 💻 pos.js - مديول نقطة البيع الذكية (V12.1 Diamond - AI-Powered)
 * واجهة متطورة مع تصنيفات ذكية، فرز ديناميكي، وعرض منتجات مبهر
 * تم تأمين حسابات الأسعار ودورة حياة الباركود وإصدار الفواتير
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

    // حالات الفلترة والفرز
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('name'); // name, price_asc, price_desc, newest, bestseller
    const [viewMode, setViewMode] = useState('grid'); // grid, list

    // حالات الدفع (Checkout)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [saleType, setSaleType] = useState('cash');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [shippingFee, setShippingFee] = useState('');

    // حالات التقسيط الخاصة بـ X-Core
    const [instType, setInstType] = useState('monthly');
    const [instValue, setInstValue] = useState('');

    // حالة الإشعارات والتحميل
    const [notification, setNotification] = useState(null);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    // حالة ماسح الباركود
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef(null);
    const scannerContainerRef = useRef(null);

    // إحصائيات المبيعات للفرز الذكي
    const [salesStats, setSalesStats] = useState({});

    // دالة أمان لجلب السعر الصحيح ومنع NaN
    const getPrice = useCallback((item, type) => {
        if (type === 'installment') return Number(item.installment_price || item.cash_price || item.price || 0);
        return Number(item.cash_price || item.price || 0);
    }, []);

    // ==========================================
    // 2. تحميل البيانات الأساسية
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
    // 4. الفلترة والفرز الذكي للمنتجات
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
            case 'name':
                result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
                break;
            case 'price_asc':
                result.sort((a, b) => getPrice(a, saleType) - getPrice(b, saleType));
                break;
            case 'price_desc':
                result.sort((a, b) => getPrice(b, saleType) - getPrice(a, saleType));
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                break;
            case 'bestseller':
                result.sort((a, b) => (salesStats[b.id] || 0) - (salesStats[a.id] || 0));
                break;
            default:
                break;
        }

        return result;
    }, [products, searchQuery, selectedCategory, sortBy, salesStats, saleType, getPrice]);

    // ==========================================
    // 5. محرك فحص إكس كور (X-Core Validator)
    // ==========================================
    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || cartTotal === 0) return null;
        
        const minInvoice = window.XConfig?.salesTerms?.minInvoiceAmount || 1000;
        if (cartTotal < minInvoice) {
            return { error: `⚠️ الفاتورة أقل من الحد الأدنى للتقسيط المسموح به (${minInvoice} ج.م)` };
        }

        if (!selectedCustomer) return null;
        
        if (!window.XCore) {
            return { error: "⚠️ محرك X-Core السيادي غير متصل. يرجى مراجعة الدعم الفني." };
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
            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط التي يستطيع العميل دفعها لحساب المدة." };

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
    // 6. ماسح الباركود بالكاميرا
    // ==========================================
    const loadHtml5QrcodeScript = () => {
        return new Promise((resolve, reject) => {
            if (window.Html5Qrcode) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const startBarcodeScanner = async () => {
        try {
            await loadHtml5QrcodeScript();
            if (!scannerContainerRef.current) return;
            
            const html5QrCode = new Html5Qrcode("barcode-scanner-container");
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0
                // تم إزالة formatsToSupport لضمان عمل المكتبة بشكل صحيح بدون أخطاء المراجع
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => handleBarcodeScanned(decodedText),
                (errorMessage) => console.log(errorMessage)
            );
        } catch (err) {
            console.error("خطأ في بدء تشغيل الكاميرا:", err);
            showNotification('error', '❌ تعذر تشغيل الكاميرا. تأكد من الإذن.');
            setIsScannerOpen(false);
        }
    };

    const stopBarcodeScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error("خطأ في إيقاف الماسح:", err);
            }
            scannerRef.current = null;
        }
    };

    const handleBarcodeScanned = (barcode) => {
        setSearchQuery(barcode);
        // التغيير في الحالة سيقوم بتشغيل دالة الإيقاف عبر useEffect لمنع التعارض
        setIsScannerOpen(false);
        
        const product = products.find(p => p.barcode === barcode);
        if (product) {
            addToCart(product);
            showNotification('success', `✅ تم إضافة ${product.name} بواسطة الباركود.`);
        } else {
            showNotification('info', `🔍 لم يتم العثور على منتج بهذا الباركود: ${barcode}`);
        }
    };

    useEffect(() => {
        if (isScannerOpen) {
            startBarcodeScanner();
        } else {
            stopBarcodeScanner();
        }
        return () => { stopBarcodeScanner(); };
    }, [isScannerOpen]);

    // ==========================================
    // 7. إتمام العملية (Execution & Auditing)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ لا يمكن طباعة فاتورة فارغة!');
        
        if ((saleType === 'shipping' || saleType === 'installment') && !selectedCustomer) {
            return showNotification('error', '⚠️ يرجى اختيار العميل لتسجيل المديونية باسمه!');
        }

        if (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) {
            return showNotification('error', '🚫 تم رفض العملية من قبل محرك المخاطر.');
        }

        setIsProcessingSale(true);
        try {
            const currentOperator = currentUser?.username || 'النظام';
            const timestamp = new Date().toISOString();

            // 1. إنشاء الفاتورة
            const invoice = {
                customer_id: selectedCustomer || 'cash_customer',
                type: saleType,
                items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: getPrice(i, saleType) })),
                subtotal: cartTotal,
                shipping_fee: Number(shippingFee || 0),
                total: finalTotal,
                date: timestamp,
                status: saleType === 'shipping' ? 'pending_delivery' : 'active',
                cashier: currentOperator
            };
            
            const addedInvoice = await window.db.add('invoices', invoice);
            // تأمين جلب المعرف في حال كان الناتج رقم أو نص مباشر من قاعدة البيانات
            const insertedId = typeof addedInvoice === 'object' ? (addedInvoice.id || addedInvoice._id) : addedInvoice;
            const invoiceRef = insertedId ? insertedId.toString().slice(0, 8).toUpperCase() : Date.now().toString().slice(-8);

            // 2. خصم المخزون وتسجيل حركة الجرد
            for (const item of cart) {
                const dbProduct = await window.db.getById('products', item.id);
                if (dbProduct) {
                    await window.db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await window.db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name,
                        type: 'sale', qty: -item.qty, date: timestamp, 
                        note: `فاتورة مبيعات رقم ${invoiceRef}`, user: currentOperator
                    });
                }
            }

            // 3. المعالجة المالية (الخزينة)
            if (saleType === 'cash' || saleType === 'shipping') {
                await window.db.add('treasury', {
                    type: 'INCOME', amount: finalTotal, 
                    description: `مبيعات (${saleType}) فاتورة: ${invoiceRef}`, 
                    created_at: timestamp, user: currentOperator
                });
            } else if (saleType === 'installment') {
                await window.db.add('treasury', {
                    type: 'INCOME', amount: xCoreValidation.downPayment, 
                    description: `مقدم تقسيط فاتورة: ${invoiceRef}`, 
                    created_at: timestamp, user: currentOperator
                });

                const remainingAmount = finalTotal - xCoreValidation.downPayment;
                const monthsCount = Math.ceil(xCoreValidation.calculatedMonths);
                const actualMonthly = remainingAmount / monthsCount;

                for (let i = 1; i <= monthsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i); 
                    await window.db.add('installments', {
                        invoice_id: insertedId,
                        customer_id: selectedCustomer,
                        amount: actualMonthly.toFixed(2),
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending',
                        created_by: currentOperator
                    });
                }
            }

            // المزامنة الفورية
            if (navigator.onLine && typeof window.db.syncWithCloud === 'function') {
                window.db.syncWithCloud();
            }

            showNotification('success', '✅ تمت العملية! تم الخصم من المخزن وتحديث الخزينة.');
            
            // تفريغ الشاشة
            setCart([]);
            setShippingFee('');
            setInstValue('');
            setSelectedCustomer('');
            setIsCheckoutOpen(false);
            loadData();

        } catch (err) {
            console.error(err);
            showNotification('error', '❌ خطأ استثنائي أثناء معالجة الفاتورة.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    // ==========================================
    // 8. واجهة المستخدم (UI)
    // ==========================================
    return (
        <div className="h-full flex flex-col relative pb-32 animate-in fade-in bg-gradient-to-br from-slate-50 to-white">
            {/* الإشعارات العائمة */}
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-8 py-4 rounded-[2rem] shadow-2xl text-white font-black text-xs md:text-sm transition-all duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600 shadow-green-600/30' : 'bg-red-600 shadow-red-600/30'}`}>
                    <span>{notification.type === 'success' ? '🚀' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث والتحكم */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md mx-2 mt-2 p-3 rounded-[2rem] shadow-lg border border-white/50">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* حقل البحث مع الكاميرا */}
                    <div className="flex-1 flex items-center bg-slate-100 rounded-[1.5rem] px-4 py-1 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                        <span className="text-xl text-slate-500 ml-2">🔍</span>
                        <input 
                            type="text" 
                            placeholder="ابحث بالاسم، الباركود، أو التصنيف..." 
                            className="w-full py-3 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:font-medium"
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            autoFocus
                        />
                        <button 
                            onClick={() => setIsScannerOpen(true)} 
                            className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg hover:bg-blue-700 transition-colors shadow-md shrink-0"
                            title="مسح باركود"
                        >
                            📷
                        </button>
                    </div>

                    {/* أزرار التحكم */}
                    <div className="flex gap-2 items-center">
                        {/* اختيار التصنيف */}
                        <select 
                            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">جميع التصنيفات</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>

                        {/* اختيار الترتيب */}
                        <select 
                            className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="name">الترتيب أبجدياً</option>
                            <option value="price_asc">السعر: من الأقل</option>
                            <option value="price_desc">السعر: من الأعلى</option>
                            <option value="newest">الأحدث</option>
                            <option value="bestseller">الأكثر مبيعاً</option>
                        </select>

                        {/* تبديل وضع العرض */}
                        <div className="bg-slate-100 rounded-xl p-1 flex">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                📱
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                📋
                            </button>
                        </div>
                    </div>
                </div>

                {/* شريط التصنيفات السريع (إذا كان هناك تصنيفات) */}
                {categories.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 custom-scroll">
                        <button 
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${selectedCategory === 'all' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}
                        >
                            الكل
                        </button>
                        {categories.slice(0, 8).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* نافذة ماسح الباركود */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-black text-lg">مسح الباركود بالكاميرا</h3>
                            <button 
                                onClick={() => setIsScannerOpen(false)} 
                                className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div 
                            id="barcode-scanner-container" 
                            ref={scannerContainerRef}
                            className="w-full h-80 bg-black"
                        ></div>
                        <div className="p-4 text-center text-sm text-slate-600 font-bold">
                            وجه الكاميرا نحو الباركود للمسح التلقائي
                        </div>
                    </div>
                </div>
            )}
            
            {/* عرض المنتجات (Grid أو List) */}
            <div className="flex-1 overflow-y-auto custom-scroll px-2 mt-4">
                {viewMode === 'grid' ? (
                    // عرض الشبكة
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {filteredAndSortedProducts.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => addToCart(p)} 
                                className="bg-white p-4 rounded-[2rem] border border-slate-100 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all text-right shadow-sm active:scale-95 flex flex-col justify-between h-44 relative overflow-hidden group"
                            >
                                {/* شارات */}
                                <div className="absolute top-0 left-0 right-0 flex justify-between p-2 z-10">
                                    {p.stock <= 3 && (
                                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md animate-pulse">
                                            نفذت الكمية
                                        </span>
                                    )}
                                    {salesStats[p.id] > 50 && (
                                        <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md">
                                            🔥 الأكثر مبيعاً
                                        </span>
                                    )}
                                    {p.is_new && (
                                        <span className="bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md">
                                            جديد
                                        </span>
                                    )}
                                </div>

                                {/* صورة المنتج (افتراضية) */}
                                <div className="w-full h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl mb-2 flex items-center justify-center text-3xl">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover rounded-2xl" />
                                    ) : (
                                        <span>📦</span>
                                    )}
                                </div>
                                
                                <p className="font-black text-slate-800 text-xs line-clamp-2 leading-relaxed relative z-10 text-right">
                                    {p.name}
                                </p>
                                
                                <div className="relative z-10 w-full mt-auto pt-2 border-t border-slate-100">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">السعر</p>
                                            <p className="text-blue-600 font-black text-base leading-none">
                                                {getPrice(p, saleType)} 
                                                <span className="text-[10px] text-blue-400 mr-1">ج</span>
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">المتاح</p>
                                            <p className={`font-black text-sm leading-none ${p.stock <= 3 ? 'text-red-500' : 'text-slate-800'}`}>
                                                {p.stock}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    // عرض القائمة
                    <div className="space-y-2">
                        {filteredAndSortedProducts.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => addToCart(p)} 
                                className="w-full bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-400 hover:shadow-lg transition-all flex items-center gap-4 active:scale-[0.99]"
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : '📦'}
                                </div>
                                <div className="flex-1 text-right">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-slate-800">{p.name}</h4>
                                        <div className="flex gap-1">
                                            {p.stock <= 3 && <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-1 rounded-full">نفذت</span>}
                                            {salesStats[p.id] > 50 && <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-1 rounded-full">🔥 شائع</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-blue-600 font-black text-lg">
                                            {getPrice(p, saleType)} <span className="text-sm text-slate-400">ج</span>
                                        </span>
                                        <span className="text-xs text-slate-500">المتبقي: {p.stock}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {filteredAndSortedProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <span className="text-6xl mb-4 opacity-50">🔍</span>
                        <p className="text-slate-500 font-black text-sm uppercase">لا توجد منتجات مطابقة</p>
                        <p className="text-slate-400 font-bold text-[10px] mt-2">جرب كلمات بحث أخرى أو اختر تصنيفاً مختلفاً</p>
                    </div>
                )}
            </div>

            {/* زر السلة العائم */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div 
                    className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[450px] bg-gradient-to-l from-slate-900 to-slate-800 text-white p-4 rounded-[2rem] shadow-2xl z-40 flex justify-between items-center cursor-pointer hover:-translate-y-1 active:scale-95 transition-all border border-slate-700"
                    onClick={() => setIsCheckoutOpen(true)}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-[1.2rem] flex items-center justify-center font-black text-2xl shadow-inner shadow-blue-400/50 relative">
                            {cart.reduce((s, i)=>s+i.qty, 0)}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الإجمالي المبدئي</p>
                            <p className="font-black text-2xl leading-none">{cartTotal.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></p>
                            <p className="text-[9px] text-slate-500 mt-1">{cart.length} منتجات</p>
                        </div>
                    </div>
                    <button className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-blue-50 transition-colors">
                        اتمام <span className="text-lg">➔</span>
                    </button>
                </div>
            )}

            {/* شاشة الدفع النهائية */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-100 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    {/* هيدر */}
                    <div className="h-20 shrink-0 bg-slate-900 px-6 text-white flex justify-between items-center shadow-lg z-50">
                        <div>
                            <h3 className="font-black text-lg md:text-xl">خزينة الدفع والإصدار</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">X-Core Engine Active</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 hover:text-white transition-colors">✕</button>
                    </div>

                    {/* المحتوى القابل للتمرير */}
                    <div className="flex-1 overflow-y-auto custom-scroll w-full p-4 md:p-8">
                        <div className="space-y-6 max-w-4xl mx-auto pb-10">
                            
                            {/* ملخص الفاتورة */}
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-4 flex items-center gap-2">
                                    <span className="text-lg">🧾</span> ملخص الفاتورة
                                </h4>
                                <div className="space-y-4 max-h-80 overflow-y-auto custom-scroll">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm font-black border-b border-slate-50 pb-4 bg-slate-50/50 p-3 rounded-2xl">
                                            <div className="flex flex-col pr-2">
                                                <span className="text-slate-800 line-clamp-1">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 mt-1 font-bold">
                                                    {item.qty} × {getPrice(item, saleType).toLocaleString()} ج
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-blue-700 text-base">
                                                    {(item.qty * getPrice(item, saleType)).toLocaleString()} ج
                                                </span>
                                                <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* نوع البيع */}
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest block">مسار العملية المالي</h4>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200">
                                    {['cash', 'shipping', 'installment'].map(t => (
                                        <button key={t} onClick={() => handleSaleTypeChange(t)} className={`py-5 rounded-2xl text-[10px] md:text-xs font-black uppercase transition-all flex flex-col items-center gap-2 ${saleType === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}>
                                            <span className="text-2xl">{t === 'cash' ? '💸' : t === 'shipping' ? '🚚' : '📅'}</span>
                                            <span>{t === 'cash' ? 'كاش' : t === 'shipping' ? 'شحن' : 'تقسيط'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* إعدادات المسار */}
                            {(saleType !== 'cash' || saleType === 'shipping') && (
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in">
                                    
                                    {saleType === 'shipping' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">رسوم الشحن</label>
                                            <input type="number" placeholder="أدخل القيمة..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                        </div>
                                    )}

                                    {saleType !== 'cash' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">اختر العميل</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-blue-500" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                                <option value="">-- اختر عميلاً --</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} (نقاط: {c.credit_score})</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {saleType === 'installment' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">دورة السداد</label>
                                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-blue-500" value={instType} onChange={e => setInstType(e.target.value)}>
                                                    <option value="monthly">شهري</option>
                                                    <option value="daily">يومي</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">القسط المستهدف</label>
                                                <input type="number" placeholder="مثال: 500" className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-600" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* X-Core Validation */}
                            {saleType === 'installment' && (
                                <div className={`p-6 md:p-8 rounded-[2rem] border shadow-md animate-in fade-in ${xCoreValidation?.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200 relative overflow-hidden'}`}>
                                    {xCoreValidation?.success && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>}
                                    
                                    <h4 className={`text-sm font-black mb-6 flex items-center gap-3 relative z-10 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                        <span className="text-2xl">🧠</span> تقرير المخاطر
                                    </h4>
                                    
                                    {xCoreValidation?.error ? (
                                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-start gap-4">
                                            <span className="text-3xl">🚫</span>
                                            <div>
                                                <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">الرفض</span>
                                                <p className="text-sm font-black text-red-700 leading-relaxed">{xCoreValidation.error}</p>
                                            </div>
                                        </div>
                                    ) : xCoreValidation?.success ? (
                                        <div className="space-y-4 text-xs font-bold text-green-900 relative z-10">
                                            <p className="bg-white/80 p-4 rounded-2xl border border-green-200 shadow-sm font-black text-green-800 text-sm">{xCoreValidation.msg}</p>
                                            
                                            <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-green-100 space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">المقدم المطلوب</span>
                                                    <span className="font-black text-2xl text-slate-900">{xCoreValidation.downPayment.toLocaleString()} ج.م</span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">عدد الأشهر</span>
                                                    <span className="font-black text-lg text-blue-600">{xCoreValidation.calculatedMonths} شهر</span>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-2xl mt-4 border border-slate-200">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">الضمانات</span>
                                                    <span className="text-xs text-slate-800 font-black leading-relaxed">{xCoreValidation.docs.description}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-white/60 rounded-[1.5rem] border border-white">
                                            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* الفوتر الثابت */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 md:p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] z-50">
                        <div className="flex justify-between items-end mb-5 px-2 max-w-4xl mx-auto">
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الإجمالي</span>
                                <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{cart.length} منتجات</span>
                            </div>
                            <span className="text-4xl font-black text-blue-600 leading-none tracking-tighter">
                                {finalTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400 tracking-normal">ج.م</span>
                            </span>
                        </div>
                        <button 
                            onClick={processSale} 
                            disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                            className={`w-full max-w-4xl mx-auto py-5 rounded-[1.5rem] font-black text-base shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white'
                            }`}
                        >
                            {isProcessingSale ? (
                                <>
                                    <span className="animate-spin text-xl">⏳</span>
                                    جاري التنفيذ...
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">🖨️</span>
                                    تأكيد وإصدار الفاتورة
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
