/**
 * 💻 pos.js - مديول نقطة البيع وإصدار العقود (V14.0 Enterprise ERP)
 * الوظيفة: شاشة المبيعات الذكية، التقسيط، التوافق مع جداول العملاء والعقود الجديدة
 * التحديث: إصلاح ظهور العملاء + واجهة مستخدم محسنة (Modern UI)
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const POSModule = ({ currentUser }) => {
    // ==========================================
    // 1. الحالات (States)
    // ==========================================
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // جميع العملاء كمرجع (allCustomers) والقائمة القابلة للظهور (customers)
    const [allCustomers, setAllCustomers] = useState([]); 
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
    // 2. تحميل البيانات (V14 Compatible)
    // ==========================================
    const loadData = useCallback(async () => {
        try {
            // التوافق مع جداول V14 (clients, contracts) والرجوع للقديم إن لم يوجد
            const [p, c1, c2, i, cats, inv1, inv2] = await Promise.all([
                window.db.getAll('products').catch(() => []),
                window.db.getAll('clients').catch(() => []), // الجدول الجديد
                window.db.getAll('customers').catch(() => []), // الجدول القديم
                window.db.getAll('installments').catch(() => []),
                window.db.getAll('categories').catch(() => []),
                window.db.getAll('contracts').catch(() => []), // الجدول الجديد
                window.db.getAll('invoices').catch(() => [])  // الجدول القديم
            ]);
            
            setProducts(p.filter(item => item.stock > 0));
            
            // دمج العملاء من الجداول القديمة والحديثة لمنع ضياع البيانات
            const allClientsData = [...(c1 || []), ...(c2 || [])];
            const uniqueClients = Array.from(new Map(allClientsData.map(item => [item.id, item])).values());
            
            setAllCustomers(uniqueClients);

            // 🐛 [إصلاح الخطأ]: عرض جميع العملاء النشطين في القائمة المنسدلة بغض النظر عن السكور
            // السكور سيتم فحصه عبر محرك X-Core عند التأكيد فقط
            setCustomers(uniqueClients.filter(cust => 
                cust.status === 'active' || cust.is_active === true || cust.active !== false
            ));
            
            setInstallmentsData(i || []);
            setCategories(cats || []);

            const allInvoices = [...(inv1 || []), ...(inv2 || [])];
            const stats = {};
            allInvoices.forEach(inv => {
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
            result = result.filter(p => String(p.category_id) === String(selectedCategory));
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
    // 5. محرك فحص إكس كور وبيانات العميل النشط
    // ==========================================
    
    const activeCustomerData = useMemo(() => {
        if (!selectedCustomer) return null;
        const customer = allCustomers.find(c => String(c.id) === String(selectedCustomer));
        if (!customer) return null;

        const customerInsts = installmentsData.filter(i => String(i.customer_id) === String(selectedCustomer));
        const currentDebtTotal = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
        const activeDebt = currentDebtTotal - totalPaid;

        const creditLimit = customer.credit_limit || (Number(customer.monthly_income || 0) * 3) || 5000;

        let guarantorInfo = { name: null, phone: null };
        if (customer.guarantor_ids && customer.guarantor_ids.length > 0) {
            const guarantor = allCustomers.find(g => String(g.id) === String(customer.guarantor_ids[0]));
            if (guarantor) {
                guarantorInfo = { name: guarantor.full_name || guarantor.name, phone: guarantor.phone };
            }
        }

        return {
            ...customer,
            activeDebt,
            creditLimit,
            guarantor_name: guarantorInfo.name,
            guarantor_phone: guarantorInfo.phone
        };
    }, [selectedCustomer, allCustomers, installmentsData]);

    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || cartTotal === 0) return null;
        const minInvoice = window.XConfig?.salesTerms?.minContractAmount || window.XConfig?.salesTerms?.minInvoiceAmount || 1000;
        if (cartTotal < minInvoice) return { error: `⚠️ العقد أقل من الحد الأدنى (${minInvoice} ج.م)` };
        if (!selectedCustomer) return null;
        if (!window.XCore) return { error: "⚠️ محرك X-Core غير متصل." };

        const customer = allCustomers.find(c => String(c.id) === String(selectedCustomer));
        if (!customer) return null;

        const customerInsts = installmentsData.filter(i => String(i.customer_id) === String(selectedCustomer));
        const currentDebt = customerInsts.reduce((sum, i) => sum + Number(i.amount), 0);
        const totalPaid = customerInsts.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);

        try {
            const multiCheck = window.XCore.canOpenMultiInvoice(
                customer.credit_score, Number(customer.monthly_income || 0), currentDebt, totalPaid, finalTotal
            );
            if (!multiCheck.can) return { error: multiCheck.msg };
            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قيمة القسط المستهدف." };

            const terms = window.XCore.calculateSaleTerms(finalTotal, instType, Number(instValue), new Date().getDate());
            if (terms.error) return { error: terms.error };

            return {
                success: true, msg: multiCheck.msg, downPayment: terms.downPayment,
                maxMonths: terms.maxMonths, calculatedMonths: terms.calculatedMonths, docs: terms.docs
            };
        } catch (err) {
            return { error: "❌ خطأ في حسابات المحرك: " + err.message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, allCustomers, installmentsData]);

    const handleAddCustomer = () => {
        if (typeof window.showTab === 'function') {
            setIsCheckoutOpen(false);
            window.showTab('crm'); 
        } else if (typeof window.location.hash !== 'undefined') {
            window.location.hash = '#crm';
            setIsCheckoutOpen(false);
        } else {
            showNotification('info', '💡 يرجى الذهاب إلى شاشة "العملاء" يدوياً لإضافة عميل جديد.');
        }
    };

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

            const realCustomerObj = allCustomers.find(c => String(c.id) === String(selectedCustomer));
            const finalCustomerId = realCustomerObj ? realCustomerObj.id : 'cash_customer';

            const invoiceObj = {
                customer_id: finalCustomerId, 
                type: saleType,
                items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: getPrice(i, saleType) })),
                subtotal: cartTotal, 
                shipping_fee: Number(shippingFee || 0), 
                total: finalTotal,
                date: timestamp, 
                status: saleType === 'shipping' ? 'pending_delivery' : 'active', 
                cashier: currentOperator
            };
            
            // الحفظ في جداول V14 (contracts) كخيار أساسي، والرجوع للقديم إن لزم الأمر
            let addedInvoice;
            if (window.db.localDb.objectStoreNames.contains('contracts')) {
                addedInvoice = await window.db.add('contracts', invoiceObj);
            } else {
                addedInvoice = await window.db.add('invoices', invoiceObj);
            }
            
            const insertedId = typeof addedInvoice === 'object' ? (addedInvoice.id || addedInvoice._id) : addedInvoice;
            const invoiceRef = insertedId ? insertedId.toString().slice(0, 8).toUpperCase() : Date.now().toString().slice(-8);

            for (const item of cart) {
                const dbProduct = await window.db.getById('products', item.id);
                if (dbProduct) {
                    await window.db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await window.db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name, type: 'sale', qty: -item.qty, 
                        date: timestamp, note: `مبيعات/عقد #${invoiceRef}`, user: currentOperator
                    });
                }
            }

            const treasuryTarget = window.db.localDb.objectStoreNames.contains('vault_transactions') ? 'vault_transactions' : 'treasury';

            if (saleType === 'cash' || saleType === 'shipping') {
                await window.db.add(treasuryTarget, { type: 'INCOME', amount: finalTotal, description: `مبيعات (${saleType}) #${invoiceRef}`, created_at: timestamp, user: currentOperator });
            } else if (saleType === 'installment') {
                await window.db.add(treasuryTarget, { type: 'INCOME', amount: xCoreValidation.downPayment, description: `مقدم عقد تقسيط #${invoiceRef}`, created_at: timestamp, user: currentOperator });
                const actualMonthly = (finalTotal - xCoreValidation.downPayment) / Math.ceil(xCoreValidation.calculatedMonths);
                for (let i = 1; i <= Math.ceil(xCoreValidation.calculatedMonths); i++) {
                    const dueDate = new Date(); dueDate.setMonth(dueDate.getMonth() + i); 
                    await window.db.add('installments', {
                        invoice_id: insertedId, contract_id: insertedId, // توافق مع الاثنين
                        customer_id: finalCustomerId, 
                        amount: actualMonthly.toFixed(2),
                        due_date: dueDate.toISOString().split('T')[0], 
                        status: 'pending', 
                        created_by: currentOperator
                    });
                }
            }

            if (navigator.onLine && typeof window.db.syncWithCloud === 'function') window.db.syncWithCloud();
            
            showNotification('success', '✅ تمت العملية بنجاح! وتم مزامنة قواعد البيانات.');
            setCart([]); setShippingFee(''); setInstValue(''); setSelectedCustomer(''); setIsCheckoutOpen(false);
            loadData(); 
        } catch (err) {
            showNotification('error', '❌ خطأ أثناء إصدار الفاتورة/العقد.');
        } finally { setIsProcessingSale(false); }
    };

    // ==========================================
    // 8. واجهة المستخدم (Modern V14 Responsive UI)
    // ==========================================
    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden relative font-sans">
            
            {/* الإشعارات العائمة */}
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-xl text-white font-bold text-sm flex items-center gap-2 backdrop-blur-md transition-all ${notification.type === 'success' ? 'bg-green-600/90 border border-green-500' : 'bg-red-600/90 border border-red-500'}`}>
                    <span>{notification.type === 'success' ? '✅' : '⚠️'}</span> {notification.message}
                </div>
            )}

            {/* الهيدر الحديث */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3 shrink-0 z-30 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 flex items-center bg-slate-100/50 rounded-2xl px-3 py-1.5 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] transition-all">
                        <span className="text-xl text-slate-400">🔍</span>
                        <input 
                            type="text" placeholder="بحث بالاسم أو الباركود..." 
                            className="w-full py-2 px-3 bg-transparent outline-none text-sm font-bold text-slate-800"
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                        <button onClick={() => setIsScannerOpen(true)} className="w-9 h-9 bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 shadow-md transition-colors active:scale-95">
                            📷
                        </button>
                    </div>

                    <button onClick={() => setIsCheckoutOpen(true)} className="relative shrink-0 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-600/20 border border-blue-500 hover:bg-blue-700 hover:scale-105 transition-all">
                        🛒
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-bounce">
                                {cart.reduce((a,b)=>a+b.qty, 0)}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto custom-scroll pb-1 hide-scrollbar">
                    <select className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none min-w-[120px] focus:border-blue-500 transition-colors" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="all">التصنيفات</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <select className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none min-w-[120px] focus:border-blue-500 transition-colors" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">أبجدياً</option>
                        <option value="price_asc">السعر ⬆</option>
                        <option value="price_desc">السعر ⬇</option>
                        <option value="bestseller">الأكثر مبيعاً</option>
                    </select>
                    <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 border border-slate-200 shadow-inner">
                        <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>📱</button>
                        <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>📋</button>
                    </div>
                </div>
            </header>

            {/* منطقة المنتجات */}
            <div className="flex-1 overflow-y-auto custom-scroll p-4 pb-32">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                        {filteredAndSortedProducts.map(p => (
                            <button 
                                key={p.id} onClick={() => addToCart(p)} 
                                className="bg-white rounded-[1.5rem] p-3 border border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 text-right flex flex-col relative group overflow-hidden"
                            >
                                <div className="absolute top-2 left-2 right-2 flex justify-between z-10">
                                    {p.stock <= 3 && <span className="bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-md border border-red-400">نفاد قريب</span>}
                                    {salesStats[p.id] > 50 && <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-md border border-amber-400">🔥 رائج</span>}
                                </div>
                                <div className="w-full aspect-[4/3] bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl mb-3 flex items-center justify-center overflow-hidden border border-slate-100/50">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <span className="text-4xl opacity-40 drop-shadow-sm group-hover:scale-110 transition-transform">📦</span>}
                                </div>
                                <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight mb-3 flex-1 group-hover:text-blue-700 transition-colors">{p.name}</h3>
                                <div className="flex justify-between items-end border-t border-slate-50 pt-2 mt-auto w-full">
                                    <div>
                                        <span className="block text-[8px] text-slate-400 font-bold">السعر</span>
                                        <span className="text-blue-600 font-black text-sm">{getPrice(p, saleType)} <span className="text-[10px]">ج.م</span></span>
                                    </div>
                                    <div className="text-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        <span className="block text-[8px] text-slate-500 font-bold">المتاح</span>
                                        <span className={`font-black text-xs ${p.stock <= 3 ? 'text-red-500' : 'text-slate-700'}`}>{p.stock}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredAndSortedProducts.map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} className="w-full bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                                    {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <span className="text-2xl group-hover:scale-110 transition-transform opacity-50">📦</span>}
                                </div>
                                <div className="flex-1 text-right">
                                    <h4 className="font-bold text-sm text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">{p.name}</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-blue-600 font-black text-sm">{getPrice(p, saleType)} <span className="text-[10px]">ج.م</span></span>
                                        <span className={`text-xs px-3 py-1 rounded-lg border ${p.stock <= 3 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>المتبقي: {p.stock}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* شريط السلة العائم السريع */}
            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-slate-900/95 text-white rounded-[2rem] p-2 pr-5 flex justify-between items-center shadow-[0_20px_50px_rgba(15,23,42,0.5)] z-40 border border-slate-700 backdrop-blur-xl animate-in slide-in-from-bottom-5">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wide">الإجمالي المبدئي</span>
                        <span className="font-black text-xl leading-none mt-1">{cartTotal.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ج.م</span></span>
                    </div>
                    <button onClick={() => setIsCheckoutOpen(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2">
                        متابعة الدفع <span>➔</span>
                    </button>
                </div>
            )}

            {/* شاشة الدفع وإصدار العقد */}
            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-100/80 backdrop-blur-md flex flex-col font-sans animate-in slide-in-from-bottom-10 duration-300">
                    <div className="bg-slate-900 text-white px-5 py-4 shrink-0 flex justify-between items-center shadow-xl z-10">
                        <div>
                            <h3 className="font-black text-lg">إصدار فاتورة / عقد جديد</h3>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> X-Core Engine Active
                            </p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 hover:rotate-90 transition-all">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-6 pb-32">
                        <div className="max-w-3xl mx-auto space-y-6">
                            
                            {/* تفاصيل السلة */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span className="text-lg bg-blue-50 p-1.5 rounded-lg">🧾</span> عناصر الفاتورة
                                </h4>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scroll">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm font-bold bg-slate-50 p-3.5 rounded-2xl border border-slate-200 hover:border-blue-200 transition-colors">
                                            <div>
                                                <span className="block text-slate-800 text-sm mb-1">{item.name}</span>
                                                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-100">{item.qty} × {getPrice(item, saleType)} ج.م</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-700 font-black text-base">{(item.qty * getPrice(item, saleType)).toLocaleString()} ج</span>
                                                <button onClick={() => removeFromCart(item.id)} className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 hover:border-red-500">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* نوع الفاتورة والإعدادات */}
                            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">مسار الدفع والتعاقد</h4>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                    {[
                                        { id: 'cash', icon: '💸', label: 'كاش مباشر' },
                                        { id: 'shipping', icon: '🚚', label: 'دفع عند الاستلام' },
                                        { id: 'installment', icon: '📅', label: 'عقد تقسيط' }
                                    ].map(t => (
                                        <button 
                                            key={t.id} onClick={() => handleSaleTypeChange(t.id)} 
                                            className={`py-4 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-2 border ${saleType === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border-blue-600 scale-105 z-10' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                                        >
                                            <span className="text-2xl drop-shadow-sm">{t.icon}</span>
                                            <span>{t.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* الإعدادات الديناميكية */}
                                {(saleType !== 'cash' || saleType === 'shipping') && (
                                    <div className="mt-6 space-y-5 pt-5 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                        {saleType === 'shipping' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">رسوم الشحن المقررة</label>
                                                <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" placeholder="أدخل الرسوم (ج.م)" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                            </div>
                                        )}
                                        {saleType !== 'cash' && (
                                            <div className="space-y-3 bg-blue-50/30 p-4 rounded-3xl border border-blue-50">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] font-black text-slate-600 block uppercase tracking-wider">العميل المُسجل (مطلوب)</label>
                                                    <button onClick={handleAddCustomer} className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center gap-1 shadow-md shadow-blue-600/20 active:scale-95">
                                                        <span>➕</span> إضافة بالـ CRM
                                                    </button>
                                                </div>
                                                <select className="w-full p-4 bg-white border border-slate-200 shadow-sm rounded-2xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                                    <option value="">-- يرجى تحديد العميل من القائمة --</option>
                                                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name || c.name} {c.credit_score ? `(سكور: ${c.credit_score})` : ''}</option>)}
                                                </select>

                                                {/* بطاقة عرض بيانات العميل الذكية عند اختياره */}
                                                {activeCustomerData && (
                                                    <div className="mt-4 bg-white border border-blue-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-xs font-bold animate-in fade-in zoom-in-95 shadow-sm">
                                                        <div className="col-span-2 flex justify-between items-center border-b border-slate-100 pb-3">
                                                            <span className="text-slate-800 font-black text-sm flex items-center gap-2">
                                                                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">👤</span> 
                                                                {activeCustomerData.full_name || activeCustomerData.name}
                                                            </span>
                                                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black border ${activeCustomerData.credit_score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : activeCustomerData.credit_score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                                ⭐ تقييم: {activeCustomerData.credit_score || 'غير محدد'}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">الحد الائتماني</span>
                                                            <span className="text-slate-800 font-black text-sm">{activeCustomerData.creditLimit.toLocaleString()} ج.م</span>
                                                        </div>
                                                        <div className="flex flex-col bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">المديونية الحالية</span>
                                                            <span className={`font-black text-sm ${activeCustomerData.activeDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>{activeCustomerData.activeDebt.toLocaleString()} ج.م</span>
                                                        </div>
                                                        <div className="col-span-2 flex flex-col pt-3 border-t border-slate-100">
                                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">بيانات الضامن المعتمد بالملف</span>
                                                            <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                                                                <span className="text-lg">🛡️</span>
                                                                <span className="text-slate-700 font-bold">
                                                                    {activeCustomerData.guarantor_name ? `${activeCustomerData.guarantor_name} ${activeCustomerData.guarantor_phone ? `(${activeCustomerData.guarantor_phone})` : ''}` : '⚠️ لا يوجد ضامن مسجل في الملف الشخصي'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {saleType === 'installment' && (
                                            <div className="grid grid-cols-2 gap-4 pt-3">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">نظام الدفع الزمني</label>
                                                    <select className="w-full p-4 bg-white border border-slate-200 shadow-sm rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all" value={instType} onChange={e => setInstType(e.target.value)}>
                                                        <option value="monthly">قسط شهري</option><option value="daily">قسط يومي</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 block mb-2 uppercase">قسط العميل المستهدف</label>
                                                    <input type="number" className="w-full p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/20 transition-all shadow-inner placeholder-blue-300" placeholder="0 ج.م" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* تقرير X-Core للتقسيط */}
                            {saleType === 'installment' && (
                                <div className={`p-6 rounded-3xl border shadow-md animate-in slide-in-from-bottom-2 ${xCoreValidation?.error ? 'bg-red-50 border-red-200' : 'bg-green-50/50 border-green-200'}`}>
                                    <h4 className={`text-xs font-black mb-4 flex items-center gap-2 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                        <span className="text-2xl drop-shadow-sm">🧠</span> تقرير محرك المخاطر الآلي (X-Core)
                                    </h4>
                                    {xCoreValidation?.error ? (
                                        <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm">
                                            <p className="text-sm font-black text-red-600 flex items-start gap-2">
                                                <span>🚫</span> {xCoreValidation.error}
                                            </p>
                                        </div>
                                    ) : xCoreValidation?.success ? (
                                        <div className="space-y-3 text-xs font-bold text-green-900">
                                            <p className="bg-white p-3.5 rounded-2xl border border-green-100 shadow-sm leading-relaxed">{xCoreValidation.msg}</p>
                                            <div className="bg-white p-4 rounded-2xl flex justify-between items-center border border-green-100 shadow-sm">
                                                <span className="text-slate-600 font-black">المقدم الإلزامي المطلوب:</span> 
                                                <span className="font-black text-xl text-emerald-600">{xCoreValidation.downPayment.toLocaleString()} <span className="text-sm">ج.م</span></span>
                                            </div>
                                            <div className="bg-white p-4 rounded-2xl flex justify-between items-center border border-green-100 shadow-sm">
                                                <span className="text-slate-600 font-black">مدة العقد المحسوبة:</span> 
                                                <span className="font-black text-xl text-blue-600">{xCoreValidation.calculatedMonths} <span className="text-sm">شهر</span></span>
                                            </div>
                                        </div>
                                    ) : <div className="text-center py-6 bg-white/50 rounded-2xl"><span className="animate-pulse font-bold text-slate-500">⏳ جاري فحص ومطابقة البيانات...</span></div>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* الفوتر وتأكيد الدفع */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:p-6 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] z-50">
                        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-4">
                            <div className="w-full md:w-auto shrink-0 text-center md:text-right md:pr-4 md:border-l border-slate-200 md:pl-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">المطلوب سداده بالفاتورة</span>
                                <span className="font-black text-3xl text-blue-600 leading-none drop-shadow-sm">{finalTotal.toLocaleString()} <span className="text-base text-slate-400">ج.م</span></span>
                            </div>
                            <button 
                                onClick={processSale} 
                                disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                                className={`w-full flex-1 py-5 rounded-2xl font-black text-base transition-all flex justify-center items-center gap-3 ${
                                    (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 active:scale-[0.98]'
                                }`}
                            >
                                {isProcessingSale ? (
                                    <span className="animate-pulse flex items-center gap-2">⏳ جاري تسجيل العقد والمزامنة...</span>
                                ) : (
                                    <>🖨️ تأكيد وإصدار الفاتورة النهائية</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ماسح الباركود المحدث */}
            {isScannerOpen && (
                <div className="fixed inset-0 z-[10000] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-5 flex justify-between items-center bg-slate-50 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><span className="text-xl">📷</span> ماسح الباركود</h3>
                            <button onClick={() => setIsScannerOpen(false)} className="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all font-black">✕</button>
                        </div>
                        <div id="barcode-scanner-container" ref={scannerContainerRef} className="w-full h-80 bg-black relative">
                            {/* إطار وهمي للتوجيه */}
                            <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none z-10"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-green-500 rounded-2xl pointer-events-none z-20"></div>
                        </div>
                        <div className="p-4 text-center bg-slate-50">
                            <span className="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">يرجى توجيه الكاميرا نحو المنتج</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
