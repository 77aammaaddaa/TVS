/**
 * 🎯 EcoFine Pro V4 - المايسترو (The Maestro)
 * إدارة التنقل، الحالات العامة، وربط الموديولات
 * التركيز: الأندرويد أولاً + سهولة القراءة
 */

const { useState, useEffect } = React;

const App = () => {
    // ==========================================
    // 1. الحالات العامة (States)
    // ==========================================
    const [isReady, setIsReady] = useState(false);       // هل القاعدة اشتغلت؟
    const [activeTab, setActiveTab] = useState('dashboard'); // الموديول المفتوح حالياً
    const [isMenuOpen, setIsMenuOpen] = useState(false);     // حالة القائمة في الموبايل
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    // ==========================================
    // 2. التشغيل الأولي (Initialization)
    // ==========================================
    useEffect(() => {
        // تشغيل قاعدة البيانات المحلية
        db.init()
            .then(() => setIsReady(true))
            .catch(err => alert("❌ خطأ في تشغيل المحرك: " + err));
    }, []);

    // ==========================================
    // 3. خريطة النظام (The Strategic Map)
    // ==========================================
    const menuGroups = [
        {
            group: "القيادة والأداء",
            items: [
                { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
                { id: 'stats_adv', label: 'إحصائيات متقدمة', icon: '📈' },
            ]
        },
        {
            group: "العملاء والائتمان",
            items: [
                { id: 'crm', label: 'العملاء والائتمان', icon: '👥' },
                { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' },
            ]
        },
        {
            group: "التشغيل والمبيعات",
            items: [
                { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
                { id: 'pos', label: 'نقطة البيع (POS)', icon: '🛒' },
                { id: 'invoices', label: 'الفواتير والمرتجعات', icon: '🧾' },
            ]
        },
        {
            group: "المالية والقانون",
            items: [
                { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
                { id: 'treasury', label: 'الخزينة والوردية', icon: '🏦' },
                { id: 'legal', label: 'القضايا والنزاعات', icon: '⚖️' },
            ]
        },
        {
            group: "البيانات والإعدادات",
            items: [
                { id: 'data_import', label: 'استيراد البيانات', icon: '📥' },
                { id: 'settings', label: 'إعدادات النظام', icon: '⚙️' },
            ]
        }
    ];

    // ==========================================
    // 4. محرك عرض الموديولات (Module Switcher)
    // ==========================================
    const renderModule = (id) => {
        // قائمة الموديولات الجاهزة للتركيب
        const modules = {
            'dashboard': <DashboardView />,
            'crm': typeof CRMModule !== 'undefined' ? <CRMModule /> : null,
            'inventory': typeof InventoryModule !== 'undefined' ? <InventoryModule /> : null,
            'pos': typeof POSModule !== 'undefined' ? <POSModule /> : null,
            'collection': typeof CollectionModule !== 'undefined' ? <CollectionModule /> : null,
            'legal': typeof LegalModule !== 'undefined' ? <LegalModule /> : null,
            'data_import': typeof ImportModule !== 'undefined' ? <ImportModule /> : null,
        };

        const CurrentComponent = modules[id];

        // لو الموديول موجود اعرضه، لو مش موجود اظهر رسالة الانتظار
        if (CurrentComponent) {
            return <div className="animate-in fade-in duration-500">{CurrentComponent}</div>;
        }

        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-5xl mb-4 grayscale">🏗️</div>
                <h3 className="font-black text-slate-800">موديول {id.toUpperCase()}</h3>
                <p className="text-xs text-slate-400 mt-2">قيد التجهيز في خطة الدومينو القادمة</p>
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
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-700 text-2xl">☰</button>
                <h2 className="mr-3 font-black text-slate-800 tracking-tighter">EcoFine Pro</h2>
                <div className="mr-auto w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">X</div>
            </header>

            {/* ب) القائمة الجانبية (Sidebar) */}
            <aside className={`fixed inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <span className="text-white font-bold">إكس القابضة</span>
                    <button onClick={() => setIsMenuOpen(false)} className="text-xl">✕</button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-6">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-black text-slate-600 uppercase mb-3 pr-2">{group.group}</h4>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}
                                    >
                                        <span>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* ج) خلفية التظليل */}
            {isMenuOpen && <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>}

            {/* د) منطقة المحتوى (Main Content) */}
            <main className="flex-1 pt-16 overflow-y-auto w-full px-4 py-6">
                <div className="max-w-5xl mx-auto">
                    {renderModule(activeTab)}
                </div>
            </main>
        </div>
    );
};

// ==========================================
// 6. المكونات الفرعية (Sub-Components)
// ==========================================

const LoadingScreen = () => (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white italic">
        جاري تحضير الأنظمة...
    </div>
);

const DashboardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-slate-400 text-xs font-bold mb-1 uppercase">إجمالي المبيعات</p>
            <h3 className="text-2xl font-black text-slate-800">0.00 <span className="text-xs">ج.م</span></h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-slate-400 text-xs font-bold mb-1 uppercase">تحصيل اليوم</p>
            <h3 className="text-2xl font-black text-green-600">0.00 <span className="text-xs text-slate-400">ج.م</span></h3>
        </div>
    </div>
);

// تشغيل التطبيق
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
