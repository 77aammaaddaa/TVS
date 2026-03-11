/**
 * 🚀 app.js - المايسترو (The X-Command Center V12.0)
 * التحديث: استقلالية النظام (Single Instance) + الربط مع إعدادات XConfig الديناميكية.
 */

const { useState, useEffect, useMemo } = React;

const App = () => {
    const [currentUser, setCurrentUser] = useState(null); 
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // تحديث الساعة حياً
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);

        // مستمعات حالة الإنترنت
        const handleOnline = () => {
            setIsOnline(true);
            if (typeof db !== 'undefined' && db.syncWithCloud) db.syncWithCloud();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // إزالة شاشة التحميل الأولية
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash?.remove(), 500);
        }

        // 🚀 تهيئة النظام المباشرة (استقلالية تامة)
        const initializeApp = async () => {
            try {
                if (window.db && window.db.init) {
                    await window.db.init(); // تشغيل المحرك المحلي
                    // هنا مستقبلاً سنسحب الإعدادات المتقدمة من الداتا بيز لنحدث XConfig
                }
                setIsReady(true);
            } catch (err) {
                console.error("App Init Error:", err);
                alert("❌ فشل تشغيل محرك إكس: " + err.message);
            }
        };

        initializeApp();

        return () => {
            clearInterval(clockTimer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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
            { id: 'pos', label: 'نقطة البيع', icon: '💻' }
        ]},
        { group: "المالية والقانون", items: [
            { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
            { id: 'treasury', label: 'الخزينة والمصاريف', icon: '🏦' },
            { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' }
        ]},
        { group: "البيانات والإعدادات", items: [
            { id: 'data_import', label: 'استيراد وتصدير (CSV)', icon: '📥' },
            { id: 'settings', label: 'الإعدادات المتقدمة', icon: '⚙️' } // هنا سيكون محركك الجديد
        ]}
    ];

    // فلترة القائمة بناءً على صلاحيات XGuard
    const menuGroups = useMemo(() => {
        if (!currentUser) return [];
        return rawMenuGroups.map(group => ({
            ...group,
            items: group.items.filter(item => 
                typeof window.XGuard !== 'undefined' ? window.XGuard.canAccess(currentUser, item.id) : true
            )
        })).filter(group => group.items.length > 0);
    }, [currentUser]);

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
            'settings': window.SettingsModule, // سيتم بناء الواجهة هنا
        };

        const Component = moduleMap[activeTab];

        if (Component) {
            return <div className="animate-in fade-in duration-500"><Component currentUser={currentUser} setActiveTab={setActiveTab} /></div>;
        }

        return (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mx-4">
                <div className="text-6xl mb-4 text-red-400">⚠️</div>
                <h3 className="font-black text-slate-800 text-lg">الموديول "{activeTab}" قيد التطوير</h3>
                <p className="text-xs text-slate-400 mt-2 font-bold">يرجى التأكد من تضمين ملف {activeTab}.js في النظام.</p>
            </div>
        );
    };

    if (!isReady) return <LoadingScreen />;

    // 🔴 بوابة الدخول (تم الاستغناء عن التفعيل السحابي لصالح الاستقلالية)
    if (!currentUser && typeof window.AuthModule !== 'undefined') {
        return <window.AuthModule onLoginSuccess={(user) => setCurrentUser(user)} />;
    }

    return (
        <div className="h-[100dvh] bg-slate-50 flex overflow-hidden flex-col" dir="rtl">
            
            <div className={`shrink-0 w-full text-center py-1 text-[9px] font-black tracking-widest uppercase transition-colors duration-500 z-[300] ${isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isOnline ? '🟢 متصل بالسحابة (يتم المزامنة)' : '🔴 وضع الأوفلاين (تخزين محلي فقط)'}
            </div>

            <header className="shrink-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-700 text-2xl active:scale-95 transition-transform md:hidden">☰</button>
                <div className="mr-3 flex flex-col hidden sm:flex">
                    <h2 className="font-black text-slate-900 leading-tight">Eco Fine <span className="text-blue-600">Pro</span></h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">
                        {window.XConfig?.identity?.storeName || 'Enterprise Edition'}
                    </p>
                </div>

                <div className="hidden md:flex items-center justify-center flex-1">
                    <div className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full shadow-inner flex items-center gap-2 text-slate-600">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">توقيت العمليات</span>
                        <span className="text-xs font-black" dir="ltr">{currentTime.toLocaleTimeString('ar-EG')}</span>
                    </div>
                </div>

                <div className="mr-auto flex items-center gap-3">
                    <div className="text-left hidden sm:block">
                        <p className="text-xs font-black text-slate-800">{currentUser?.username}</p>
                        <p className="text-[9px] font-bold text-slate-400">{currentUser?.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-[1rem] bg-slate-900 flex items-center justify-center text-white font-black shadow-lg border-2 border-slate-800">
                        {currentUser?.username?.charAt(0).toUpperCase() || 'X'}
                    </div>
                    
                    <button 
                        onClick={() => window.XGuard?.logout()} 
                        className="text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm hidden md:flex items-center gap-2"
                    >
                        خروج 🚪
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <aside className={`absolute md:static inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
                        <div>
                            <span className="text-white font-black text-lg block">القائمة الرئيسية</span>
                            <p className="text-[9px] text-blue-500 font-bold tracking-widest uppercase mt-1">Version 12.0</p>
                        </div>
                        <button onClick={() => setIsMenuOpen(false)} className="text-xl text-slate-500 hover:text-white transition-colors md:hidden">✕</button>
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
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-slate-800 text-slate-300'}`}
                                        >
                                            <span className="text-base">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                    
                    <div className="p-4 border-t border-slate-800 shrink-0 md:hidden bg-slate-950">
                        <button 
                            onClick={() => window.XGuard?.logout()} 
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-black text-xs hover:bg-red-500 hover:text-white shadow-sm transition-all"
                        >
                            <span>🚪</span> إنهاء الجلسة
                        </button>
                    </div>
                </aside>

                {isMenuOpen && <div className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-sm transition-opacity md:hidden" onClick={() => setIsMenuOpen(false)}></div>}

                <main className="flex-1 overflow-y-auto w-full px-2 py-4 md:px-6 md:py-6 custom-scroll">
                    <div className="max-w-7xl mx-auto h-full">
                        {renderModule()}
                    </div>
                </main>
            </div>
        </div>
    );
};

// ==========================================
// 🎯 لوحة التحكم ومركز القيادة (The Command Center)
// ==========================================
const DashboardView = ({ currentUser, setActiveTab }) => {
    const [stats, setStats] = useState({
        totalSales: 0, totalCollected: 0, pendingDebt: 0, 
        activeCustomers: 0, lowStock: 0, legalCases: 0, netTreasury: 0
    });

    useEffect(() => {
        let isMounted = true;
        const fetchStats = async () => {
            if (!window.db) return;
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
        const interval = setInterval(fetchStats, 10000); 
        return () => { isMounted = false; clearInterval(interval); };
    }, []);

    const totalPortfolio = stats.totalCollected + stats.pendingDebt;
    const collectionRate = totalPortfolio > 0 ? ((stats.totalCollected / totalPortfolio) * 100).toFixed(1) : 0;
    const riskRate = stats.totalSales > 0 ? ((stats.pendingDebt / stats.totalSales) * 100).toFixed(1) : 0;
    const liquidityRate = stats.totalSales > 0 ? ((stats.netTreasury / stats.totalSales) * 100).toFixed(1) : 0;

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "صباح الخير" : "مساء الخير";
    const userName = currentUser?.username || 'يا زعيم';
    // قراءة اسم المؤسسة ديناميكياً من الإعدادات
    const storeName = window.XConfig?.identity?.storeName || 'المؤسسة';

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
            
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                        {greeting}، <span className="text-blue-600">{userName}</span> 👋
                    </h2>
                    <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">
                        ملخص تشغيل: <span className="text-slate-800">{storeName}</span>
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-2 w-full xl:w-auto relative z-10">
                    <button onClick={() => setActiveTab('crm')} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 px-4 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-sm">
                        <span className="text-base md:text-lg">🤝</span> عميل جديد
                    </button>
                    <button onClick={() => setActiveTab('pos')} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-slate-900 border border-slate-900 px-4 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black text-white hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20">
                        <span className="text-base md:text-lg">💻</span> عملية بيع
                    </button>
                    <button onClick={() => setActiveTab('treasury')} className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-red-50 border border-red-100 px-4 py-3 md:py-4 rounded-2xl text-[10px] md:text-xs font-black text-red-600 hover:bg-red-100 active:scale-95 transition-all shadow-sm">
                        <span className="text-base md:text-lg">🏦</span> صرف نقدية
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 p-6 md:p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                    <div>
                        <p className="text-blue-400 text-[10px] md:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            صافي الخزينة (الكاش المتاح)
                        </p>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                            {stats.netTreasury.toLocaleString()} <span className="text-sm md:text-xl font-normal opacity-50">ج.م</span>
                        </h2>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/5 w-full sm:w-auto text-right">
                        <p className="text-[10px] text-slate-300 uppercase font-bold mb-1">إجمالي المبيعات الشاملة</p>
                        <p className="text-xl md:text-2xl font-black text-white">{stats.totalSales.toLocaleString()} <span className="text-[10px] opacity-70">ج.م</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RatioCard title="كفاءة التحصيل" percentage={collectionRate} color="green" desc="نسبة المبالغ المحصلة من إجمالي الأقساط" />
                <RatioCard title="معدل المخاطرة" percentage={riskRate} color="amber" desc="الديون المعلقة بالسوق مقارنة بالمبيعات" />
                <RatioCard title="مؤشر السيولة" percentage={liquidityRate} color="blue" desc="السيولة الحرة في الخزينة بعد المصاريف" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="تم تحصيله (كاش)" val={stats.totalCollected} color="green" icon="💸" />
                <StatBox label="باقي بالسوق (ديون)" val={stats.pendingDebt} color="amber" icon="⏳" />
                <StatBox label="إجمالي العملاء" val={stats.activeCustomers} color="blue" icon="👥" />
                <StatBox label="قضايا ونزاعات" val={stats.legalCases} color="red" icon="⚖️" />
            </div>

            {stats.lowStock > 0 && (
                <div className="bg-orange-50 p-5 md:p-6 rounded-[2rem] border border-orange-200 flex items-start sm:items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 shrink-0 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">⚠️</div>
                    <div>
                        <h4 className="font-black text-orange-800 text-sm md:text-base mb-1">تنبيه نواقص المخزون</h4>
                        <p className="text-[10px] md:text-xs font-bold text-orange-600 leading-relaxed">يوجد <span className="text-orange-800 font-black px-1">{stats.lowStock}</span> أصناف أوشكت على النفاذ من المخزن الرئيسي، يتطلب إصدار أمر شراء فوراً لتجنب توقف المبيعات.</p>
                    </div>
                    <button onClick={() => setActiveTab('inventory')} className="hidden sm:block mr-auto bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-orange-700 transition-colors shadow-md">
                        عرض النواقص
                    </button>
                </div>
            )}
        </div>
    );
};

const RatioCard = ({ title, percentage, color, desc }) => {
    const colorClasses = { green: 'bg-green-500', amber: 'bg-amber-500', blue: 'bg-blue-500', red: 'bg-red-500' };
    return (
        <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{title}</h4>
                <span className={`text-sm font-black text-${color}-600 bg-${color}-50 px-2 py-1 rounded-lg border border-${color}-100`}>{percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden shadow-inner">
                <div className={`${colorClasses[color]} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }}></div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed">{desc}</p>
        </div>
    );
};

const StatBox = ({ label, val, icon }) => (
    <div className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:-translate-y-1 transition-transform group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-sm">{icon}</div>
        </div>
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">{val.toLocaleString()}</h3>
    </div>
);

const LoadingScreen = () => (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 mb-8 relative">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-black text-xl">X</div>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter mb-2">Eco Fine <span className="text-blue-500">Pro</span></h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Initializing System...</p>
        </div>
    </div>
);

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
