/**
 * 🎯 marketing.js - محرك التسويق والعروض الترويجية (Enterprise V12.0)
 * المطور: Techno Vision Solutions (Mr. X)
 * الوظيفة: إدارة كوبونات الخصم، برامج الولاء، والعروض المؤقتة لدعم المبيعات.
 */

const { useState, useEffect, useMemo } = React;

const MarketingModule = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('coupons');
    const [isLoading, setIsLoading] = useState(true);
    
    // قواعد البيانات
    const [coupons, setCoupons] = useState([]);
    const [loyaltyConfig, setLoyaltyConfig] = useState({});
    const [flashSales, setFlashSales] = useState([]);

    // حالات النوافذ المنبثقة (Modals)
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [isFlashSaleModalOpen, setIsFlashSaleModalOpen] = useState(false);

    // ⛔ حماية سيادية: هذه الشاشة للإدارة والتسويق فقط
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MARKETING') {
        if (window.XAudit) window.XAudit.log('وصول مرفوض', 'التسويق', `حاول ${currentUser?.username || 'مجهول'} الدخول لإدارة العروض`, 'critical', currentUser?.username);
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-[2.5rem] border border-red-100">
                <span className="text-6xl mb-4">⛔</span>
                <h2 className="text-xl font-black text-red-600">منطقة محظورة</h2>
                <p className="text-xs text-red-400 font-bold mt-2">إدارة ميزانية التسويق والعروض مصرح بها للإدارة العليا فقط.</p>
            </div>
        );
    }

    // ==========================================
    // 1. جلب البيانات من محركات النظام
    // ==========================================
    const loadMarketingData = async () => {
        setIsLoading(true);
        try {
            const [cData, fData] = await Promise.all([
                window.db.getAll('coupons').catch(() => []),
                window.db.getAll('flash_sales').catch(() => [])
            ]);
            
            setCoupons(cData || []);
            setFlashSales(fData || []);
            
            // جلب إعدادات الولاء من XConfig
            const lConfig = window.XConfig?.loyaltyProgram || {
                enabled: false,
                pointsPerPound: 0.1, // كل 10 جنيه بنقطة
                poundPerPoint: 1,    // النقطة بجنيه عند الخصم
                minPointsToRedeem: 50
            };
            setLoyaltyConfig(lConfig);

        } catch (err) {
            console.error("خطأ في جلب بيانات التسويق:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadMarketingData(); }, []);

    // ==========================================
    // 2. إدارة كوبونات الخصم (Coupons)
    // ==========================================
    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        const form = e.target;
        const code = form.code.value.trim().toUpperCase();
        
        if (coupons.some(c => c.code === code && c.is_active)) {
            return alert("⚠️ هذا الكود موجود ونشط بالفعل!");
        }

        const newCoupon = {
            code: code,
            type: form.type.value, // 'fixed' or 'percent'
            value: Number(form.value.value),
            max_uses: Number(form.max_uses.value) || 9999,
            used_count: 0,
            valid_until: form.valid_until.value,
            is_active: true,
            created_by: currentUser?.username,
            created_at: new Date().toISOString()
        };

        try {
            await window.db.add('coupons', newCoupon);
            if (window.XAudit) window.XAudit.log('إنشاء كوبون', 'التسويق', `تم إنشاء كود خصم جديد: ${code}`, 'info', currentUser?.username);
            
            setIsCouponModalOpen(false);
            loadMarketingData();
        } catch (err) {
            alert("❌ فشل حفظ الكوبون.");
        }
    };

    const toggleCouponStatus = async (id, currentStatus) => {
        try {
            await window.db.update('coupons', id, { is_active: !currentStatus });
            loadMarketingData();
        } catch (err) {
            console.error("فشل تحديث حالة الكوبون");
        }
    };

    // ==========================================
    // 3. إدارة إعدادات الولاء (Loyalty Config)
    // ==========================================
    const saveLoyaltyConfig = async () => {
        try {
            // تحديث الكائن في الذاكرة الحية
            window.XConfig = {
                ...window.XConfig,
                loyaltyProgram: loyaltyConfig
            };
            // حفظه في LocalStorage (أو Supabase لو متاح)
            localStorage.setItem('ecofine_config', JSON.stringify(window.XConfig));
            
            if (window.XAudit) window.XAudit.log('تحديث الولاء', 'التسويق', `تم تحديث سياسة نقاط الولاء للعملاء`, 'warning', currentUser?.username);
            alert("✅ تم تفعيل سياسة الولاء الجديدة بنجاح!");
        } catch (err) {
            alert("❌ فشل حفظ إعدادات الولاء.");
        }
    };

    if (isLoading) return <div className="p-20 text-center text-slate-400 font-black animate-pulse">جاري تحميل ترسانة التسويق... ⏳</div>;

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6 pb-20 animate-in fade-in max-w-5xl mx-auto">
            
            {/* 🎛️ التبويبات العلوية */}
            <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-auto snap-x custom-scroll sticky top-0 z-20">
                {[
                    {id: 'coupons', label: 'كوبونات الخصم', icon: '🎟️'},
                    {id: 'loyalty', label: 'برنامج الولاء', icon: '💎'},
                    {id: 'flash', label: 'العروض المؤقتة', icon: '⚡'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 snap-center flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-[1.5rem] text-xs font-black transition-all min-w-[120px] ${activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <span className="text-2xl">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* 🎟️ قسم الكوبونات */}
            {activeTab === 'coupons' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">إدارة أكواد الخصم</h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">تستخدم في شاشة الـ POS لخصم المبالغ للعملاء</p>
                        </div>
                        <button onClick={() => setIsCouponModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black shadow-md shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-2">
                            <span>➕</span> إنشاء كوبون جديد
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coupons.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(c => {
                            const isExpired = new Date(c.valid_until) < new Date();
                            const isFullyUsed = c.used_count >= c.max_uses;
                            const statusColor = (!c.is_active || isExpired || isFullyUsed) ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-purple-200 shadow-sm';
                            
                            return (
                                <div key={c.id} className={`p-6 rounded-[2rem] border relative overflow-hidden transition-all ${statusColor}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg border border-purple-100 font-mono font-black text-lg tracking-widest shadow-inner">
                                            {c.code}
                                        </div>
                                        <button 
                                            onClick={() => toggleCouponStatus(c.id, c.is_active)}
                                            className={`w-12 h-6 rounded-full p-1 transition-colors ${c.is_active ? 'bg-purple-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${c.is_active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4 border-b border-slate-100 pb-4">
                                        <p className="text-xs font-black text-slate-700 flex justify-between">
                                            <span className="text-slate-400">قيمة الخصم:</span>
                                            <span className="text-purple-600 text-lg">{c.value}{c.type === 'percent' ? '%' : ' ج.م'}</span>
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 flex justify-between">
                                            <span>الاستخدامات:</span>
                                            <span className={`${isFullyUsed ? 'text-red-500 font-black' : 'text-slate-800'}`}>{c.used_count} / {c.max_uses}</span>
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 flex justify-between">
                                            <span>صالح حتى:</span>
                                            <span className={`${isExpired ? 'text-red-500 font-black line-through' : 'text-slate-800'}`}>{c.valid_until}</span>
                                        </p>
                                    </div>
                                    
                                    <div className="text-center">
                                        {isExpired ? <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-md">منتهي الصلاحية</span> : 
                                         isFullyUsed ? <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-md">تم استنفاذ الحد الأقصى</span> : 
                                         !c.is_active ? <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">معطل يدوياً</span> : 
                                         <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-md">نشط وجاهز للاستخدام</span>}
                                    </div>
                                </div>
                            );
                        })}
                        {coupons.length === 0 && (
                            <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-[2rem] border border-dashed border-slate-200">
                                <span className="text-4xl block mb-2 opacity-50">🎟️</span>
                                لا توجد أكواد خصم مسجلة حالياً.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 💎 قسم برنامج الولاء */}
            {activeTab === 'loyalty' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden border border-slate-800">
                        <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><span className="text-3xl">💎</span> نظام مكافآت العملاء (X-Loyalty)</h2>
                            <p className="text-xs text-cyan-200 font-bold leading-relaxed max-w-2xl">
                                اجعل عملائك مدمنين على الشراء منك! عند تفعيل هذا النظام، سيحصل العميل على نقاط مع كل قسط يدفعه أو كاش يدفعه، ويمكنه استبدالها بخصم نقدي في معاملاته القادمة.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between p-4 bg-cyan-50 rounded-2xl border border-cyan-100">
                            <div>
                                <h4 className="text-sm font-black text-cyan-900">تفعيل برنامج الولاء</h4>
                                <p className="text-[10px] text-cyan-700 font-bold mt-1">يظهر رصيد النقاط في شاشة التحصيل والـ POS</p>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-6 h-6 accent-cyan-600"
                                checked={loyaltyConfig.enabled}
                                onChange={e => setLoyaltyConfig({...loyaltyConfig, enabled: e.target.checked})}
                            />
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 transition-opacity duration-300 ${loyaltyConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">كل كام جنيه = نقطة؟</label>
                                <div className="relative">
                                    <input type="number" step="0.1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500" value={loyaltyConfig.pointsPerPound === 0.1 ? 10 : (1/loyaltyConfig.pointsPerPound)} onChange={e => setLoyaltyConfig({...loyaltyConfig, pointsPerPound: (1/Number(e.target.value))})} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">ج.م</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 pl-2 font-bold">مثال: كل 10 جنيه العميل يدفعها يأخد 1 نقطة</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">قيمة النقطة عند الاستبدال</label>
                                <div className="relative">
                                    <input type="number" step="0.5" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500" value={loyaltyConfig.poundPerPoint} onChange={e => setLoyaltyConfig({...loyaltyConfig, poundPerPoint: Number(e.target.value)})} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">ج.م</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 pl-2 font-bold">مثال: كل نقطة تخصم 1 جنيه من الفاتورة</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 pl-2">الحد الأدنى للاستبدال</label>
                                <div className="relative">
                                    <input type="number" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500" value={loyaltyConfig.minPointsToRedeem} onChange={e => setLoyaltyConfig({...loyaltyConfig, minPointsToRedeem: Number(e.target.value)})} />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">نقطة</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 pl-2 font-bold">لا يمكن الخصم إذا كان رصيده أقل من هذا الرقم</p>
                            </div>
                        </div>

                        <button onClick={saveLoyaltyConfig} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
                            حفظ سياسة نظام الولاء 💾
                        </button>
                    </div>
                </div>
            )}

            {/* ⚡ قسم العروض المؤقتة */}
            {activeTab === 'flash' && (
                <div className="space-y-6 animate-in fade-in">
                     <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm text-center">
                        <span className="text-6xl mb-4 opacity-50">🚧</span>
                        <h2 className="text-lg font-black text-slate-800">جاري تطوير العروض المؤقتة (Flash Sales)</h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">سيتم إتاحة تخفيضات التصنيفات التلقائية في التحديث القادم.</p>
                    </div>
                </div>
            )}

            {/* 🚀 نافذة إنشاء كوبون جديد (Modal) */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                        <div className="bg-purple-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-[-50%] right-[-10%] w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                            <h3 className="font-black text-lg relative z-10 flex items-center gap-2"><span>🎟️</span> إصدار كود خصم</h3>
                            <button onClick={() => setIsCouponModalOpen(false)} className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/40 relative z-10 transition-colors">✕</button>
                        </div>

                        <form onSubmit={handleSaveCoupon} className="p-6 md:p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">كود الكوبون (إنجليزي/أرقام)</label>
                                <input name="code" required placeholder="مثال: EID50" style={{textTransform: 'uppercase'}} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black font-mono text-slate-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">نوع الخصم</label>
                                    <select name="type" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:border-purple-500 appearance-none">
                                        <option value="fixed">مبلغ ثابت (ج.م)</option>
                                        <option value="percent">نسبة مئوية (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">القيمة</label>
                                    <input name="value" type="number" required min="1" placeholder="50" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-purple-600 outline-none focus:border-purple-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">صالح حتى</label>
                                    <input name="valid_until" type="date" required defaultValue={today} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">أقصى عدد استخدام</label>
                                    <input name="max_uses" type="number" defaultValue="100" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 outline-none focus:border-purple-500" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 rounded-2xl font-black text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-600/30 active:scale-95 transition-all mt-4">
                                حفظ وتفعيل الكود ✔️
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

window.MarketingModule = MarketingModule;
