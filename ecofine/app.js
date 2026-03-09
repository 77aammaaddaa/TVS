/**
 * 🚀 EcoFine Pro V6 Turbo - المايسترو (The X-Command Center)
 * تم دمج مركز القيادة المبسط (النسب الذهبية الثلاثة) لاتخاذ القرارات اللحظية.
 */

const { useState, useEffect, useMemo } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    useEffect(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash?.remove(), 500);
        }

        if (typeof db !== 'undefined') {
            db.init()
                .then(() => setIsReady(true))
                .catch(err => alert("❌ فشل تشغيل محرك إكس القابضة: " + err));
        } else {
            alert("⚠️ ملف database.js غير موجود!");
        }
    }, []);

    const rawMenuGroups = [
        { group: "القيادة والأداء", items: [
            { id: 'dashboard', label: 'لوحة التحكم المركزية', icon: '📊' },
            { id: 'hr', label: 'شؤون الموظفين والنقاط', icon: '👥' },
            { id: 'users', label: 'إدارة الصلاحيات (UAC)', icon: '🔑' }
        ]},
        { group: "العملاء والائتمان", items: [
            { id: 'crm', label: 'العملاء والضامنين', icon: '🤝' },
            { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' }
        ]},
        { group: "المخازن والمشتريات", items: [
            { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
            { id: 'suppliers', label: 'إدارة الموردين', icon: '🏢' },
            { id: 'purchases', label: 'المشتريات والتوريد', icon: '🛒' }
        ]},
        { group: "التشغيل والمبيعات", items: [
            { id: 'pos', label: 'نقطة البيع (التقسيط)', icon: '💻' }
        ]},
        { group: "المالية والقانون", items: [
            { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
            { id: 'treasury', label: 'الخزينة والمصاريف', icon: '🏦' },
            { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' }
        ]},
        { group: "البيانات والإعدادات", items: [
            { id: 'data_import', label: 'استيراد وتصدير (CSV)', icon: '📥' },
            { id: 'settings', label: 'المزامنة والطباعة', icon: '⚙️' }
        ]}
    ];

    const menuGroups = useMemo(() => {
        return rawMenuGroups.map(group => ({
            ...group,
            items: group.items.filter(item => 
                typeof window.XGuard !== 'undefined' ? window.XGuard.canAccess(user.role, item.id) : true
            )
        })).filter(group => group.items.length > 0);
    }, [user.role]);

    const renderModule = () => {
        const moduleMap = {
            'dashboard': DashboardView,
            'hr': window.HRModule,
            'users': window.UsersModule,
            'crm': window.CRMModule,
            'survey': window.SurveyModule,
            'inventory': window.InventoryModule,
            'suppliers': window.SuppliersModule,
            'purchases': window.PurchasesModule,
            'pos': window.POSModule,
            'collection': window.CollectionModule,
            'treasury': window.TreasuryModule,
            'legal': window.LegalModule,
            'data_import': window.ImportModule,
            'settings': window.SettingsModule,
        };

        const Component = moduleMap[activeTab];

        if (Component) {
            return <div className="animate-in fade-in duration-500"><Component /></div>;
        }

        return (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="text-5xl mb-4 text-red-400">⚠️</div>
                <h3 className="font-black text-slate-800 text-lg">الموديول {activeTab} غير متوفر</h3>
                <p className="text-xs text-slate-400 mt-2">يرجى التحقق من تضمين ملف {activeTab}.js في الصفحة</p>
            </div>
        );
    };

    if (!isReady) return <LoadingScreen />;

    return (
        <div className="h-screen bg-slate-100 flex overflow-hidden" dir="rtl">
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-700 text-2xl active:scale-95 transition-transform">☰</button>
                <div className="mr-3 flex flex-col">
                    <h2 className="font-black text-slate-900 leading-tight">إكس القابضة</h2>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">EcoFine V6 Turbo</span>
                </div>
                <div className="mr-auto flex items-center gap-2">
                    <div className="text-left hidden sm:block">
                        <p className="text-xs font-black text-slate-800">{user.name}</p>
                        <p className="text-[9px] font-bold text-slate-400">{user.role}</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shadow-lg">7X</div>
                </div>
            </header>

            <aside className={`fixed inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <span className="text-white font-black text-lg">القائمة الرئيسية</span>
                        <p className="text-[10px] text-blue-500 font-bold">بوابة العمليات السريعة</p>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="text-xl text-slate-500 hover:text-white transition-colors">✕</button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 pr-2">{group.group}</h4>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 text-slate-300'}`}
                                    >
                                        <span className="text-base">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {isMenuOpen && <div className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>}

            <main className="flex-1 pt-20 pb-10 overflow-y-auto w-full px-4 custom-scroll">
                <div className="max-w-5xl mx-auto">
                    {renderModule()}
                </div>
            </main>
        </div>
    );
};

// ==========================================
// 🎯 لوحة التحكم ومركز القيادة (The Command Center)
// ==========================================
const DashboardView = () => {
    const [stats, setStats] = useState({
        totalSales: 0, totalCollected: 0, pendingDebt: 0, 
        activeCustomers: 0, lowStock: 0, legalCases: 0, netTreasury: 0
    });

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            try {
                const [invoices, installments, customers, products, legal, expenses] = await Promise.all([
                    db.getAll('invoices').catch(() => []), db.getAll('installments').catch(() => []),
                    db.getAll('customers').catch(() => []), db.getAll('products').catch(() => []),
                    db.getAll('legal_cases').catch(() => []), db.getAll('expenses').catch(() => [])
                ]);

                if (!isMounted) return;

                const sales = (invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
                const collected = (installments || []).filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const pending = (installments || []).filter(i => i.status === 'pending').reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const totalExpenses = (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);

                setStats({
                    totalSales: sales, totalCollected: collected, pendingDebt: pending,
                    activeCustomers: (customers || []).length, lowStock: (products || []).filter(p => p.stock <= 3).length,
                    legalCases: (legal || []).length, netTreasury: collected - totalExpenses
                });
            } catch (err) { console.error("Dashboard Sync Error:", err); }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    // حساب النسب الذهبية لاتخاذ القرار
    const totalPortfolio = stats.totalCollected + stats.pendingDebt;
    const collectionRate = totalPortfolio > 0 ? ((stats.totalCollected / totalPortfolio) * 100).toFixed(1) : 0;
    const riskRate = stats.totalSales > 0 ? ((stats.pendingDebt / stats.totalSales) * 100).toFixed(1) : 0;
    const liquidityRate = stats.totalSales > 0 ? ((stats.netTreasury / stats.totalSales) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            
            {/* 1. بطاقة السيولة النقدية الكبرى */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">صافي الخزينة (الكاش المتاح)</p>
                        <h2 className="text-4xl md:text-5xl font-black">{stats.netTreasury.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></h2>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">إجمالي المبيعات</p>
                        <p className="text-xl font-black">{stats.totalSales.toLocaleString()} ج.م</p>
                    </div>
                </div>
            </div>

            {/* 2. مؤشرات النسب الذهبية الثلاثة (The 3 Golden Ratios) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RatioCard title="كفاءة التحصيل" percentage={collectionRate} color="green" desc="نسبة المبالغ المحصلة من إجمالي الأقساط" />
                <RatioCard title="معدل المخاطرة" percentage={riskRate} color="amber" desc="الديون المعلقة بالسوق مقارنة بالمبيعات" />
                <RatioCard title="مؤشر السيولة" percentage={liquidityRate} color="blue" desc="السيولة الحرة في الخزينة بعد المصاريف" />
            </div>

            {/* 3. إحصائيات سريعة للتشغيل الميداني */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="تم تحصيله (كاش)" val={stats.totalCollected} color="green" icon="💸" />
                <StatBox label="باقي بالسوق (ديون)" val={stats.pendingDebt} color="amber" icon="⏳" />
                <StatBox label="إجمالي العملاء" val={stats.activeCustomers} color="blue" icon="👥" />
                <StatBox label="قضايا ونزاعات" val={stats.legalCases} color="red" icon="⚖️" />
            </div>

            {/* 4. تنبيهات استراتيجية */}
            {stats.lowStock > 0 && (
                <div className="bg-orange-50 p-5 rounded-[2rem] border border-orange-200 flex items-center gap-4 shadow-sm animate-pulse">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-xl font-black">!</div>
                    <div>
                        <h4 className="font-black text-orange-800 text-sm">تنبيه نواقص المخزون</h4>
                        <p className="text-[10px] font-bold text-orange-600">يوجد {stats.lowStock} أصناف أوشكت على النفاذ، يتطلب إصدار أمر شراء فوراً.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// مكون شريط النسبة الذهبية
const RatioCard = ({ title, percentage, color, desc }) => {
    const colorClasses = {
        green: 'bg-green-500',
        amber: 'bg-amber-500',
        blue: 'bg-blue-500',
        red: 'bg-red-500'
    };
    
    return (
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{title}</h4>
                <span className={`text-sm font-black text-${color}-600`}>{percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                <div className={`${colorClasses[color]} h-2 rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-[9px] font-bold text-slate-400">{desc}</p>
        </div>
    );
};

// مكون بطاقة الإحصاء السريعة
const StatBox = ({ label, val, color, icon }) => (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-transform active:scale-95">
        <div className="text-xl mb-3">{icon}</div>
        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <h3 className={`text-lg font-black text-slate-800`}>{val.toLocaleString()}</h3>
    </div>
);

// شاشة التحميل الأولي
const LoadingScreen = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black tracking-widest">ECOFINE <span className="text-blue-500">V6</span></h2>
        <p className="text-xs font-bold text-slate-500 mt-2">جاري تجهيز غرفة العمليات...</p>
    </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
