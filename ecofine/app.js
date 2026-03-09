/**
 * 🎯 EcoFine Pro V6 - المايسترو (The Maestro)
 * إدارة التنقل، الصلاحيات، وربط جميع موديولات إكس القابضة
 * التصميم: Mobile-First (Redmi 10 Optimized) + X-Guard UAC
 */

const { useState, useEffect } = React;

const App = () => {
    // ==========================================
    // 1. الحالات العامة (States)
    // ==========================================
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // المستخدم الحالي (في النسخة النهائية سيتم ربطه بشاشة تسجيل الدخول)
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    // ==========================================
    // 2. التشغيل الأولي (Initialization)
    // ==========================================
    useEffect(() => {
        // تشغيل قاعدة البيانات المحلية والمحركات الخلفية
        if (typeof db !== 'undefined') {
            db.init()
                .then(() => setIsReady(true))
                .catch(err => alert("❌ فشل تشغيل محرك إكس القابضة: " + err));
        } else {
            alert("⚠️ ملف database.js غير موجود أو لم يتم تحميله!");
        }
    }, []);

    // ==========================================
    // 3. خريطة النظام المكتملة (The Strategic Map)
    // ==========================================
    const rawMenuGroups = [
        {
            group: "القيادة والأداء",
            items: [
                { id: 'dashboard', label: 'لوحة التحكم المركزية', icon: '📊' },
                { id: 'hr', label: 'شؤون الموظفين والنقاط', icon: '👥' },
                { id: 'users', label: 'إدارة الصلاحيات (UAC)', icon: '🔑' }
            ]
        },
        {
            group: "العملاء والائتمان",
            items: [
                { id: 'crm', label: 'العملاء والضامنين', icon: '🤝' },
                { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' }
            ]
        },
        {
            group: "المخازن والمشتريات",
            items: [
                { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
                { id: 'suppliers', label: 'إدارة الموردين', icon: '🏢' },
                { id: 'purchases', label: 'المشتريات والتوريد', icon: '🛒' }
            ]
        },
        {
            group: "التشغيل والمبيعات",
            items: [
                { id: 'pos', label: 'نقطة البيع (التقسيط)', icon: '💻' },
                // { id: 'invoices', label: 'العقود والفواتير', icon: '🧾' } // موديول مستقبلي
            ]
        },
        {
            group: "المالية والقانون",
            items: [
                { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
                { id: 'treasury', label: 'الخزينة والمصاريف', icon: '🏦' },
                { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' }
            ]
        },
        {
            group: "البيانات والإعدادات",
            items: [
                { id: 'data_import', label: 'استيراد وتصدير (CSV)', icon: '📥' },
                { id: 'settings', label: 'المزامنة والسحابة', icon: '⚙️' }
            ]
        }
    ];

    // فلترة القائمة بناءً على صلاحيات المستخدم (X-Guard)
    const menuGroups = rawMenuGroups.map(group => ({
        ...group,
        items: group.items.filter(item => typeof XGuard !== 'undefined' ? XGuard.canAccess(user.role, item.id) : true)
    })).filter(group => group.items.length > 0);

    // ==========================================
    // 4. محرك عرض الموديولات (The Switcher)
    // ==========================================
    const renderModule = (id) => {
        const modules = {
            'dashboard': <DashboardView />,
            'hr': typeof HRModule !== 'undefined' ? <HRModule /> : null,
            'users': typeof UsersModule !== 'undefined' ? <UsersModule /> : null,
            'crm': typeof CRMModule !== 'undefined' ? <CRMModule /> : null,
            'survey': typeof SurveyModule !== 'undefined' ? <SurveyModule /> : null,
            'inventory': typeof InventoryModule !== 'undefined' ? <InventoryModule /> : null,
            'suppliers': typeof SuppliersModule !== 'undefined' ? <SuppliersModule /> : null,
            'purchases': typeof PurchasesModule !== 'undefined' ? <PurchasesModule /> : null,
            'pos': typeof POSModule !== 'undefined' ? <POSModule /> : null,
            'collection': typeof CollectionModule !== 'undefined' ? <CollectionModule /> : null,
            'treasury': typeof TreasuryModule !== 'undefined' ? <TreasuryModule /> : null,
            'legal': typeof LegalModule !== 'undefined' ? <LegalModule /> : null,
            'data_import': typeof ImportModule !== 'undefined' ? <ImportModule /> : null,
            'settings': typeof SettingsModule !== 'undefined' ? <SettingsModule /> : null,
        };

        const CurrentComponent = modules[id];

        if (CurrentComponent) {
            return <div className="animate-in fade-in duration-500">{CurrentComponent}</div>;
        }

        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="text-5xl mb-4 grayscale opacity-50">🏗️</div>
                <h3 className="font-black text-slate-800 text-lg">موديول {id.toUpperCase()}</h3>
                <p className="text-xs text-slate-400 mt-2 font-bold">هذا الموديول قيد التجهيز في خطة الدومينو القادمة</p>
            </div>
        );
    };

    // ==========================================
    // 5. واجهة العرض (The UI Shell)
    // ==========================================
    if (!isReady) return <LoadingScreen />;

    return (
        <div className="h-screen bg-slate-100 flex overflow-hidden" dir="rtl">
            
            {/* أ) الهيدر العلوي */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-700 text-2xl active:scale-95 transition-transform">☰</button>
                <div className="mr-3 flex flex-col">
                    <h2 className="font-black text-slate-900 leading-tight">إكس القابضة</h2>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">EcoFine V6</span>
                </div>
                <div className="mr-auto flex items-center gap-2">
                    <div className="text-left hidden sm:block">
                        <p className="text-xs font-black text-slate-800">{user.name}</p>
                        <p className="text-[9px] font-bold text-slate-400">{user.role}</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black shadow-lg">7X</div>
                </div>
            </header>

            {/* ب) القائمة الجانبية (Sidebar) */}
            <aside className={`fixed inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <span className="text-white font-black text-lg">القائمة الرئيسية</span>
                        <p className="text-[10px] text-blue-500 font-bold">بوابة العمليات</p>
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

            {/* ج) خلفية التظليل للموبايل */}
            {isMenuOpen && <div className="fixed inset-0 bg-slate-900/60 z-[90] backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>}

            {/* د) منطقة المحتوى (Main Content) */}
            <main className="flex-1 pt-20 pb-10 overflow-y-auto w-full px-4 custom-scroll">
                <div className="max-w-5xl mx-auto">
                    {renderModule(activeTab)}
                </div>
            </main>
        </div>
    );
};

// ==========================================
// 6. لوحة القيادة الديناميكية (Dynamic Dashboard)
// ==========================================
const DashboardView = () => {
    const [stats, setStats] = useState({
        totalSales: 0, totalCollected: 0, pendingDebt: 0, 
        activeCustomers: 0, lowStock: 0, legalCases: 0, netTreasury: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [invoices, installments, customers, products, legal, expenses] = await Promise.all([
                    db.getAll('invoices'), db.getAll('installments'), db.getAll('customers'),
                    db.getAll('products'), db.getAll('legal_cases'), db.getAll('expenses')
                ]);

                const sales = (invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
                const collected = (installments || []).filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const pending = (installments || []).filter(i => i.status === 'pending').reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const totalExpenses = (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                
                setStats({
                    totalSales: sales,
                    totalCollected: collected,
                    pendingDebt: pending,
                    activeCustomers: (customers || []).length,
                    lowStock: (products || []).filter(p => p.stock <= 3).length,
                    legalCases: (legal || []).length,
                    netTreasury: collected - totalExpenses
                });
            } catch (err) { console.error("Dashboard Sync Error:", err); }
        };
        
        fetchStats();
        const interval = setInterval(fetchStats, 60000); // تحديث كل دقيقة
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* بطاقة السيولة النقدية */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-2">صافي الخزينة (السيولة المتاحة)</p>
                    <h2 className="text-4xl md:text-5xl font-black">{stats.netTreasury.toLocaleString()} <span className="text-sm font-normal opacity-50">ج.م</span></h2>
                </div>
            </div>

            {/* الكروت الإحصائية الأربعة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox label="إجمالي المبيعات" val={stats.totalSales} color="blue" icon="📈" />
                <StatBox label="تم تحصيله" val={stats.totalCollected} color="green" icon="✅" />
                <wall>
                <StatBox label="ديون في السوق" val={stats.pendingDebt} color="amber" icon="⏳" />
                <StatBox label="عملاء نشطين" val={stats.activeCustomers} color="slate" icon="👥" />
                </wall>
            </div>

            {/* التنبيهات الميدانية */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${stats.lowStock > 0 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>📦</div>
                        <div>
                            <h4 className="font-black text-slate-800 text-sm">حالة المخزون</h4>
                            <p className="text-[10px] font-bold text-slate-400">{stats.lowStock > 0 ? `يوجد ${stats.lowStock} صنف رصيده أقل من 3` : 'المخزون آمن ومستقر'}</p>
                        </div>
                    </div>
                    {stats.lowStock > 0 && <span className="bg-orange-600 text-white text-[9px] px-3 py-1 rounded-full font-black animate-pulse">تنبيه</span>}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl">⚖️</div>
                    <div>
                        <h4 className="font-black text-slate-800 text-sm">النزاعات القانونية</h4>
                        <p className="text-[10px] font-bold text-slate-400">يوجد {stats.legalCases} ملفات في الشؤون القانونية</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, val, color, icon }) => (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-transform active:scale-95">
        <div className="text-xl mb-3">{icon}</div>
        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
        <h3 className={`text-xl font-black text-${color}-600`}>{val.toLocaleString()}</h3>
    </div>
);

const LoadingScreen = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black tracking-widest">ECOFINE <span className="text-blue-500">V6</span></h2>
        <p className="text-xs font-bold text-slate-500 mt-2">جاري تهيئة محركات إكس القابضة...</p>
    </div>
);

// تشغيل التطبيق
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
