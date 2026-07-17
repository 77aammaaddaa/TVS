// purchases.js - مديول المشتريات وتوريد المخزون (EcoFine V6)

const PurchasesModule = () => {
    const [suppliers, setSuppliers] = React.useState([]);
    const [products, setProducts] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState('new_purchase');
    const [formData, setFormData] = React.useState({ supplier_id: '', product_id: '', qty: '', buy_price: '' });

    const loadData = async () => {
        const [s, p] = await Promise.all([db.getAll('suppliers'), db.getAll('products')]);
        setSuppliers(s);
        setProducts(p);
    };

    React.useEffect(() => { loadData(); }, []);

    const handlePurchase = async (e) => {
        e.preventDefault();
        try {
            const product = products.find(p => p.id === formData.product_id);
            const newQty = Number(product.stock) + Number(formData.qty);

            // 1. تسجيل فاتورة الشراء
            await db.add('purchases', { ...formData, date: new Date().toISOString() });

            // 2. تحديث المخزن (زيادة الكمية وتحديث سعر التكلفة إذا تغير)
            await db.update('products', product.id, { 
                stock: newQty,
                cost_price: Number(formData.buy_price) // تحديث لآخر سعر شراء
            });

            // 3. تسجيل حركة في سجل المخزن
            await db.add('inventory_logs', {
                product_id: product.id,
                product_name: product.name,
                type: 'purchase',
                qty: Number(formData.qty),
                date: new Date().toISOString()
            });

            alert("✅ تم توريد البضاعة للمخزن وتحديث الأرصدة");
            setFormData({ supplier_id: '', product_id: '', qty: '', buy_price: '' });
            loadData();
        } catch (err) { alert("❌ فشل في إتمام الشراء"); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">🛒 توريد بضاعة جديدة</h3>
                <form onSubmit={handlePurchase} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase">المورد</label>
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                                <option value="">اختر المورد...</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase">الصنف</label>
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.product_id} onChange={e => setFormData({...formData, product_id: e.target.value})}>
                                <option value="">اختر الصنف المراد توريده...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} (الحالي: {p.stock})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="الكمية المشتراة" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} />
                        <input type="number" placeholder="سعر شراء القطعة" required className="w-full p-4 bg-slate-50 border rounded-2xl font-black" value={formData.buy_price} onChange={e => setFormData({...formData, buy_price: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl">تأكيد عملية الشراء وتحديث المخزن</button>
                </form>
            </div>
        </div>
    );
};
window.PurchasesModule = PurchasesModule;
