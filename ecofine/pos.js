/**
 * 💻 pos.js - مديول نقطة البيع الذكية (Enterprise V12.0 Platinum Plus)
 * المطور: Techno Vision Solutions (Mr. X)
 * التحديثات: دعم صوت مسدس الباركود (Beep)، باركود الفاتورة المطبوعة، استقرار محرك X-Core.
 */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const POSModule = ({ currentUser }) => {
    // ==========================================
    // 1. الحالات والمراجع (States & Refs)
    // ==========================================
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [installmentsData, setInstallmentsData] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    // حالات الدفع
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [saleType, setSaleType] = useState('cash'); 
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [shippingFee, setShippingFee] = useState('');
    
    // حالات التقسيط
    const [instType, setInstType] = useState('monthly'); 
    const [instValue, setInstValue] = useState(''); 
    
    // حالة الإشعارات والتحميل
    const [notification, setNotification] = useState(null);
    const [isProcessingSale, setIsProcessingSale] = useState(false);

    const searchInputRef = useRef(null);

    // ==========================================
    // 2. محرك الصوت (Beep Engine)
    // ==========================================
    const playBeep = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800; // تردد صوت الكاشير
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) { console.warn("Audio not supported"); }
    }, []);

    // ==========================================
    // 3. تحميل البيانات الأساسية
    // ==========================================
    const loadData = useCallback(async () => {
        try {
            const [p, c, i] = await Promise.all([
                window.db.getAll('products').catch(() => []),
                window.db.getAll('customers').catch(() => []),
                window.db.getAll('installments').catch(() => [])
            ]);
            
            setProducts(p.filter(item => item.stock > 0)); 
            
            const minScore = window.XConfig?.creditPolicy?.minScoreToEntry || 50;
            setCustomers(c.filter(cust => cust.status === 'active' && cust.credit_score >= minScore));
            
            setInstallmentsData(i);
        } catch (error) {
            showNotification('error', '❌ فشل في الاتصال بقاعدة بيانات المخزن والعملاء.');
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // ==========================================
    // 4. إدارة السلة (Cart & Barcode Logic)
    // ==========================================
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lowerQuery = searchQuery.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerQuery) || (p.barcode && p.barcode.toLowerCase().includes(lowerQuery)));
    }, [products, searchQuery]);

    const addToCart = (product) => {
        playBeep(); // 🔊 تشغيل صوت الكاشير
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
        if(searchInputRef.current) searchInputRef.current.focus();
    };

    // التقاط ضغطة Enter من مسدس الباركود
    const handleBarcodeScan = (e) => {
        if (e.key === 'Enter' && searchQuery) {
            const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === searchQuery.toLowerCase());
            if (exactMatch) {
                addToCart(exactMatch);
            } else if (filteredProducts.length === 1) {
                addToCart(filteredProducts[0]);
            } else {
                showNotification('error', '⚠️ لم يتم العثور على الباركود الممسوح.');
                setSearchQuery('');
            }
        }
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
        return cart.reduce((sum, item) => sum + ((saleType === 'installment' ? item.installment_price : item.cash_price) * item.qty), 0);
    }, [cart, saleType]);

    const finalTotal = cartTotal + (saleType === 'shipping' ? Number(shippingFee || 0) : 0);

    // ==========================================
    // 5. محرك فحص إكس كور (X-Core Validator)
    // ==========================================
    const xCoreValidation = useMemo(() => {
        if (saleType !== 'installment' || cartTotal === 0) return null;
        
        const minInvoice = window.XConfig?.salesTerms?.minInvoiceAmount || 1000;
        if (cartTotal < minInvoice) {
            return { error: `⚠️ الفاتورة أقل من الحد الأدنى للتقسيط (${minInvoice} ج.م)` };
        }

        if (!selectedCustomer) return null;
        if (!window.XCore) return { error: "⚠️ محرك X-Core السيادي غير متصل." };

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
            if (!instValue || Number(instValue) <= 0) return { error: "يرجى إدخال قدرة العميل على دفع القسط." };

            const purchaseDay = new Date().getDate();
            const terms = window.XCore.calculateSaleTerms(finalTotal, instType, Number(instValue), purchaseDay);

            if (terms.error) return { error: terms.error };

            return { success: true, msg: multiCheck.msg, downPayment: terms.downPayment, maxMonths: terms.maxMonths, calculatedMonths: terms.calculatedMonths, docs: terms.docs };
        } catch (err) {
            return { error: "❌ خطأ في المحرك: " + err.message };
        }
    }, [saleType, selectedCustomer, cartTotal, finalTotal, instType, instValue, customers, installmentsData]);

    // ==========================================
    // 6. محرك الطباعة الحرارية (Thermal Print Engine)
    // ==========================================
    const generateAndPrintReceipt = (invoice, invoiceRef, customerName, xCoreData) => {
        const storeName = window.XConfig?.identity?.storeName || 'إكس القابضة';
        const currency = window.XConfig?.identity?.currency || 'ج.م';
        const typeLabel = saleType === 'cash' ? 'كاش (نقدي)' : saleType === 'shipping' ? 'دفع عند الاستلام' : 'تقسيط';

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        const htmlContent = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>إيصال مبيعات #${invoiceRef}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; padding: 10px; margin: 0; width: 80mm; color: #000; font-size: 12px; font-weight: bold; }
                    .text-center { text-align: center; }
                    .header-title { font-size: 20px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; border-bottom: 2px dashed #000; padding-bottom: 5px; }
                    .info-row { margin-bottom: 4px; display: flex; justify-content: space-between; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th, td { text-align: right; padding: 4px 0; border-bottom: 1px dotted #ccc; }
                    th { font-size: 11px; }
                    .total-section { font-size: 16px; font-weight: 900; margin-top: 10px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; }
                    .xcore-section { border: 1px dashed #000; padding: 5px; margin-top: 10px; border-radius: 5px; }
                    .footer { text-align: center; font-size: 10px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
                    /* خدعة بسيطة لرسم باركود بالفونت */
                    .fake-barcode { font-family: 'Libre Barcode 39', cursive, sans-serif; font-size: 30px; font-weight: normal; margin-top: 10px; letter-spacing: 2px;}
                    @media print { body { width: 100%; margin: 0; padding: 0; } }
                </style>
            </head>
            <body onload="setTimeout(function(){ window.print(); window.close(); }, 500);">
                <div class="text-center header-title">${storeName}</div>
                
                <div class="info-row"><span>رقم الفاتورة:</span> <span>#${invoiceRef}</span></div>
                <div class="info-row"><span>التاريخ:</span> <span dir="ltr">${new Date(invoice.date).toLocaleString('ar-EG')}</span></div>
                <div class="info-row"><span>الكاشير:</span> <span>${invoice.cashier}</span></div>
                <div class="info-row"><span>النوع:</span> <span>${typeLabel}</span></div>
                ${customerName ? `<div class="info-row"><span>العميل:</span> <span>${customerName}</span></div>` : ''}
                
                <div class="divider"></div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 45%;">الصنف</th>
                            <th style="width: 15%;">الكمية</th>
                            <th style="width: 20%;">السعر</th>
                            <th style="width: 20%;">إجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.qty}</td>
                                <td>${item.price}</td>
                                <td>${item.qty * item.price}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${invoice.shipping_fee > 0 ? `<div class="info-row"><span>رسوم الشحن:</span> <span>${invoice.shipping_fee} ${currency}</span></div>` : ''}

                <div class="info-row total-section">
                    <span>الإجمالي:</span> 
                    <span>${invoice.total.toLocaleString()} ${currency}</span>
                </div>

                ${saleType === 'installment' && xCoreData ? `
                    <div class="xcore-section">
                        <div class="text-center" style="margin-bottom:5px;">-- تفاصيل التقسيط --</div>
                        <div class="info-row"><span>المقدم (الآن):</span> <span>${xCoreData.downPayment.toLocaleString()} ${currency}</span></div>
                        <div class="info-row"><span>التقسيط على:</span> <span>${xCoreData.calculatedMonths} شهور</span></div>
                    </div>
                ` : ''}

                <div class="footer">
                    <div>احتفظ بهذا الإيصال لضمان حقوقك</div>
                    <div class="fake-barcode text-center">*${invoiceRef}*</div>
                    <div style="margin-top:5px;">Powered by Eco Fine Pro V12</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // ==========================================
    // 7. إتمام العملية (Execution & Auditing)
    // ==========================================
    const processSale = async () => {
        if (cart.length === 0) return showNotification('error', '⚠️ لا يمكن طباعة فاتورة فارغة!');
        if ((saleType === 'shipping' || saleType === 'installment') && !selectedCustomer) return showNotification('error', '⚠️ يرجى اختيار العميل لتسجيل المديونية باسمه!');
        if (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) return showNotification('error', '🚫 تم رفض العملية من قبل محرك المخاطر.');

        setIsProcessingSale(true);
        try {
            const currentOperator = currentUser?.username || 'النظام';
            const timestamp = new Date().toISOString();

            // 1. إنشاء الفاتورة
            const invoice = {
                customer_id: selectedCustomer || 'cash_customer',
                type: saleType,
                items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: saleType === 'installment' ? i.installment_price : i.cash_price })),
                subtotal: cartTotal,
                shipping_fee: Number(shippingFee || 0),
                total: finalTotal,
                date: timestamp,
                status: saleType === 'shipping' ? 'pending_delivery' : 'active',
                cashier: currentOperator
            };
            const addedInvoice = await window.db.add('invoices', invoice);
            const invoiceRef = addedInvoice.id.slice(0, 8).toUpperCase();

            // 2. خصم المخزون وتسجيل حركة الجرد
            for (const item of cart) {
                const dbProduct = await window.db.getById('products', item.id);
                if (dbProduct) {
                    await window.db.update('products', item.id, { stock: dbProduct.stock - item.qty });
                    await window.db.add('inventory_logs', {
                        product_id: item.id, product_name: item.name, type: 'sale', qty: -item.qty, date: timestamp, note: `فاتورة مبيعات ${invoiceRef}`, user: currentOperator
                    });
                }
            }

            // 3. المعالجة المالية (الخزينة)
            if (saleType === 'cash' || saleType === 'shipping') {
                await window.db.add('treasury', { type: 'INCOME', amount: finalTotal, description: `مبيعات (${saleType}) فاتورة: ${invoiceRef}`, created_at: timestamp, user: currentOperator });
            } else if (saleType === 'installment') {
                await window.db.add('treasury', { type: 'INCOME', amount: xCoreValidation.downPayment, description: `مقدم تقسيط فاتورة: ${invoiceRef}`, created_at: timestamp, user: currentOperator });

                const remainingAmount = finalTotal - xCoreValidation.downPayment;
                const monthsCount = Math.ceil(xCoreValidation.calculatedMonths);
                const actualMonthly = remainingAmount / monthsCount;

                for (let i = 1; i <= monthsCount; i++) {
                    const dueDate = new Date();
                    dueDate.setMonth(dueDate.getMonth() + i); 
                    await window.db.add('installments', {
                        invoice_id: addedInvoice.id, customer_id: selectedCustomer, amount: actualMonthly.toFixed(2), due_date: dueDate.toISOString().split('T')[0], status: 'pending', created_by: currentOperator
                    });
                }
            }

            // المزامنة الفورية
            if (navigator.onLine && typeof window.db.syncWithCloud === 'function') window.db.syncWithCloud();

            // 🖨️ استدعاء محرك الطباعة
            const customerObj = customers.find(c => c.id === selectedCustomer);
            const customerName = customerObj ? customerObj.full_name : (saleType === 'cash' ? 'عميل نقدي' : '');
            generateAndPrintReceipt(invoice, invoiceRef, customerName, xCoreValidation);

            showNotification('success', '✅ تمت العملية! تم إرسال الفاتورة للطباعة.');
            
            // تفريغ الشاشة
            setCart([]);
            setShippingFee('');
            setInstValue('');
            setSelectedCustomer('');
            setIsCheckoutOpen(false);
            loadData();
            if(searchInputRef.current) searchInputRef.current.focus();

        } catch (err) {
            console.error(err);
            showNotification('error', '❌ خطأ استثنائي أثناء معالجة الفاتورة.');
        } finally {
            setIsProcessingSale(false);
        }
    };

    return (
        <div className="h-full flex flex-col relative pb-32 animate-in fade-in">
            {notification && (
                <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[300] px-8 py-4 rounded-[2rem] shadow-2xl text-white font-black text-xs md:text-sm transition-all duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600 shadow-green-600/30' : 'bg-red-600 shadow-red-600/30'}`}>
                    <span>{notification.type === 'success' ? '🚀' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            {/* شريط البحث المطور (دعم الباركود السريع) */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-sm mb-4 sticky top-0 z-10 flex gap-2 items-center mx-2 mt-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shrink-0">🔍</div>
                <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="امسح الباركود أو اكتب اسم المنتج (اضغط Enter للإضافة السريعة)..." 
                    className="w-full bg-transparent outline-none text-sm font-black text-slate-800 placeholder:font-bold placeholder:text-slate-400" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={handleBarcodeScan}
                    autoFocus
                />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll px-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-[2rem] border border-slate-100 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all text-right shadow-sm active:scale-95 flex flex-col justify-between h-40 relative overflow-hidden group">
                            {p.stock <= 3 && <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl z-10 animate-pulse shadow-md">نواقص</span>}
                            <p className="font-black text-slate-800 text-xs line-clamp-2 leading-relaxed relative z-10">{p.name}</p>
                            <div className="relative z-10 w-full mt-auto pt-3 border-t border-slate-50">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">السعر</p>
                                        <p className="text-blue-600 font-black text-base leading-none">{saleType === 'installment' ? p.installment_price : p.cash_price} <span className="text-[10px] text-blue-400">ج</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">المتاح</p>
                                        <p className={`font-black text-sm leading-none ${p.stock <= 3 ? 'text-red-500' : 'text-slate-800'}`}>{p.stock}</p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                            <span className="text-5xl mb-4 opacity-50">🛒</span>
                            <p className="text-slate-500 font-black text-sm uppercase">لا توجد منتجات مطابقة</p>
                        </div>
                    )}
                </div>
            </div>

            {cart.length > 0 && !isCheckoutOpen && (
                <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-[400px] bg-slate-900 text-white p-4 rounded-[2rem] shadow-2xl z-40 flex justify-between items-center cursor-pointer hover:-translate-y-1 active:scale-95 transition-all border border-slate-700" onClick={() => setIsCheckoutOpen(true)}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-[1.2rem] flex items-center justify-center font-black text-2xl shadow-inner shadow-blue-400/50">
                            {cart.reduce((s, i)=>s+i.qty, 0)}
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الإجمالي المبدئي</p>
                            <p className="font-black text-2xl leading-none">{cartTotal.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></p>
                        </div>
                    </div>
                    <button className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2">الدفع ➔</button>
                </div>
            )}

            {isCheckoutOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-100 w-full h-[100dvh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                    <div className="h-20 shrink-0 bg-slate-900 px-6 text-white flex justify-between items-center shadow-lg z-50">
                        <div>
                            <h3 className="font-black text-lg md:text-xl">خزينة الدفع والإصدار</h3>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">X-Core Engine Active</p>
                        </div>
                        <button onClick={() => setIsCheckoutOpen(false)} className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-xl hover:bg-red-500 hover:text-white transition-colors">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll w-full p-4 md:p-8">
                        <div className="space-y-6 max-w-4xl mx-auto pb-10">
                            
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 border-b border-slate-100 pb-4 flex items-center gap-2">
                                    <span className="text-lg">🧾</span> ملخص الفاتورة
                                </h4>
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm font-black border-b border-slate-50 pb-4 bg-slate-50/50 p-3 rounded-2xl">
                                            <div className="flex flex-col pr-2">
                                                <span className="text-slate-800 line-clamp-1">{item.name}</span>
                                                <span className="text-[10px] text-slate-500 mt-1 font-bold">الكمية: {item.qty} × {(saleType === 'installment' ? item.installment_price : item.cash_price).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-4 shrink-0">
                                                <span className="text-blue-700 text-base">{(item.qty * (saleType === 'installment' ? item.installment_price : item.cash_price)).toLocaleString()} ج</span>
                                                <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest block">مسار العملية المالي</h4>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-2 rounded-[1.5rem] border border-slate-200">
                                    {['cash', 'shipping', 'installment'].map(t => (
                                        <button key={t} onClick={() => handleSaleTypeChange(t)} className={`py-5 rounded-2xl text-[10px] md:text-xs font-black uppercase transition-all flex flex-col items-center gap-2 ${saleType === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}>
                                            <span className="text-2xl">{t === 'cash' ? '💸' : t === 'shipping' ? '🚚' : '📅'}</span>
                                            <span>{t === 'cash' ? 'كاش (نقدي)' : t === 'shipping' ? 'دفع عند الاستلام' : 'تقسيط'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(saleType !== 'cash' || saleType === 'shipping') && (
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 animate-in fade-in">
                                    {saleType === 'shipping' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">رسوم التوصيل الشحن</label>
                                            <input type="number" placeholder="أدخل القيمة بالجنيه..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={shippingFee} onChange={e => setShippingFee(e.target.value)} />
                                        </div>
                                    )}

                                    {saleType !== 'cash' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">تحديد العميل (إجباري لإنشاء المديونية)</label>
                                            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-blue-500 shadow-sm" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                                <option value="">-- اضغط للبحث واختيار العميل --</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name} (سكور: {c.credit_score})</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {saleType === 'installment' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">دورة سداد القسط</label>
                                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none appearance-none focus:ring-2 focus:ring-blue-500" value={instType} onChange={e => setInstType(e.target.value)}>
                                                    <option value="monthly">شهري 📅</option>
                                                    <option value="daily">يومي ⏳</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">القدرة الشرائية (القسط المُراد دفعه)</label>
                                                <input type="number" placeholder="مثال: 500 جنيه..." className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl text-sm font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-600 shadow-inner" value={instValue} onChange={e => setInstValue(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {saleType === 'installment' && (
                                <div className={`p-6 md:p-8 rounded-[2rem] border shadow-md animate-in fade-in ${xCoreValidation?.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200 relative overflow-hidden'}`}>
                                    {xCoreValidation?.success && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>}
                                    <h4 className={`text-sm font-black mb-6 flex items-center gap-3 relative z-10 ${xCoreValidation?.error ? 'text-red-800' : 'text-green-800'}`}>
                                        <span className="text-2xl">🧠</span> تقرير X-CORE الاستراتيجي للمخاطر
                                    </h4>
                                    
                                    {xCoreValidation?.error ? (
                                        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-start gap-4">
                                            <span className="text-3xl">🚫</span>
                                            <div>
                                                <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">سبب الرفض</span>
                                                <p className="text-sm font-black text-red-700 leading-relaxed">{xCoreValidation.error}</p>
                                            </div>
                                        </div>
                                    ) : xCoreValidation?.success ? (
                                        <div className="space-y-4 text-xs font-bold text-green-900 relative z-10">
                                            <p className="bg-white/80 p-4 rounded-2xl border border-green-200 shadow-sm font-black text-green-800 text-sm">{xCoreValidation.msg}</p>
                                            <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-green-100 space-y-4">
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">مطلوب سداده الآن (المقدم)</span>
                                                    <span className="font-black text-2xl text-slate-900">{xCoreValidation.downPayment.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></span>
                                                </div>
                                                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">فترة السداد المحسوبة أوتوماتيكياً</span>
                                                    <span className="font-black text-lg text-blue-600">{xCoreValidation.calculatedMonths} شهور</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-white/60 rounded-[1.5rem] border border-white"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div></div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 bg-white border-t border-slate-200 p-5 md:p-6 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] z-50">
                        <div className="flex justify-between items-end mb-5 px-2 max-w-4xl mx-auto">
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الصافي المطلوب</span>
                                <span className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">{cart.length} منتجات</span>
                            </div>
                            <span className="text-4xl font-black text-blue-600 leading-none tracking-tighter">{finalTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400 tracking-normal">ج.م</span></span>
                        </div>
                        <button 
                            onClick={processSale} 
                            disabled={isProcessingSale || (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error))}
                            className={`w-full max-w-4xl mx-auto py-5 rounded-[1.5rem] font-black text-base shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                (saleType === 'installment' && (!xCoreValidation || xCoreValidation.error)) 
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
                            }`}
                        >
                            {isProcessingSale ? <span className="animate-spin text-xl">⏳</span> : <span className="text-xl">🖨️</span>}
                            {isProcessingSale ? 'جاري الإصدار...' : 'تأكيد العملية وطباعة الإيصال'}
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
