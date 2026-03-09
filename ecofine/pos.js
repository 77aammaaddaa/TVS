// pos.js - مديول نقطة البيع وإصدار الفواتير (النسخة الشاملة لسنتر عبدالله)

const POSModule = () => {
    const [step, setStep] = React.useState(1); // 1: اختيار العميل والمنتج، 2: شروط القسط
    const [cart, setCart] = React.useState([]);
    const [customers, setCustomers] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [selectedCust, setSelectedCust] = React.useState('');
    const [installmentData, setInstallmentData] = React.useState({
        type: 'monthly', // شهري أو يومي
        period: 10,     // عدد الشهور
        down_payment: 0
    });

    const loadData = async () => {
        const c = await db.getAll('customers');
        const p = await db.getAll('products');
        setCustomers(c);
        setProducts(p);
    };

    React.useEffect(() => { loadData(); }, []);

    // حساب الإجمالي
    const total = cart.reduce((sum, item) => sum + (item.installment_price * item.qty), 0);

    const addToCart = (p) => {
        if (p.stock <= 0) return alert("المنتج نافذ!");
        setCart([...cart, { ...p, qty: 1 }]);
    };

    const executeSale = () => {
        // هنا هتحصل عملية الحفظ في القاعدة لاحقاً
        alert(`تم إصدار فاتورة لـ ${selectedCust} بإجمالي ${total} ج.م`);
        setCart([]);
        setStep(1);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* عرض الخطوات */}
            <div className="flex justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                <div className={`px-4 py-2 rounded-2xl font-black text-xs ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1. السلة</div>
                <div className={`px-4 py-2 rounded-2xl font-black text-xs ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2. القسط</div>
            </div>

            {step === 1 ? (
                <div className="space-y-4">
                    {/* اختيار العميل */}
                    <select 
                        className="w-full p-4 bg-white border rounded-2xl font-bold shadow-sm"
                        onChange={(e) => setSelectedCust(e.target.value)}
                    >
                        <option value="">اختر العميل المشتري...</option>
                        {customers.map(c => <option key={c.id} value={c.full_name}>{c.full_name} ({c.credit_score}%)</option>)}
                    </select>

                    {/* اختيار المنتجات */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-3xl border-2 border-slate-100 hover:border-blue-600 text-right flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-800">{p.name}</p>
                                    <p className="text-xs text-blue-600 font-bold">{p.installment_price} ج قسط</p>
                                </div>
                                <span className="text-slate-200">➕</span>
                            </button>
                        ))}
                    </div>

                    {/* سلة المشتريات */}
                    {cart.length > 0 && (
                        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                            <h4 className="font-bold mb-4">أصناف الفاتورة:</h4>
                            {cart.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm mb-2 border-b border-slate-800 pb-2">
                                    <span>{item.name}</span>
                                    <b>{item.installment_price} ج</b>
                                </div>
                            ))}
                            <div className="mt-4 flex justify-between items-center">
                                <p className="text-xs">الإجمالي بالتقسيط:</p>
                                <p className="text-2xl font-black">{total} ج</p>
                            </div>
                            <button onClick={() => setStep(2)} className="w-full bg-blue-600 py-4 rounded-2xl mt-4 font-black">التالي: شروط التعاقد</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-6">
                    <h3 className="font-black text-lg border-b pb-4">شروط التقسيط (X-Policy)</h3>
                    
                    <div className="space-y-4">
                        <label className="block text-xs font-bold text-slate-400">نظام الدفع</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setInstallmentData({...installmentData, type: 'monthly'})} className={`py-3 rounded-xl font-bold ${installmentData.type === 'monthly' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>شهري</button>
                            <button onClick={() => setInstallmentData({...installmentData, type: 'daily'})} className={`py-3 rounded-xl font-bold ${installmentData.type === 'daily' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>يومي</button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2">مدة التقسيط (شهور)</label>
                            <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={installmentData.period} onChange={e => setInstallmentData({...installmentData, period: e.target.value})}>
                                <option value="10">10 شهور (عادي)</option>
                                <option value="12">12 شهر (فوق 100 ألف)</option>
                                <option value="15">15 شهر (استثنائي)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2">المقدم (التقديمة)</label>
                            <input type="number" className="w-full p-4 bg-slate-50 border rounded-2xl font-black text-blue-600" placeholder="0.00 ج" onChange={e => setInstallmentData({...installmentData, down_payment: e.target.value})} />
                            <p className="text-[10px] text-slate-400 mt-2 font-bold italic">* ملاحظة: التقديمة تغطي الأيام المتبقية من الشهر الحالي.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                        <div className="flex justify-between text-xs"><span>القسط المتوقع:</span><b>{(total - (installmentData.down_payment || 0)) / (installmentData.period || 1)} ج</b></div>
                    </div>

                    <button onClick={executeSale} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">اعتماد العقد وطباعة الوصلات</button>
                    <button onClick={() => setStep(1)} className="w-full text-slate-400 font-bold text-sm">رجوع للسلة</button>
                </div>
            )}
        </div>
    );
};

window.POSModule = POSModule;
