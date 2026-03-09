// app.js - المايسترو الشامل (X-Holding ERP Maestro V4)
// التركيز: الأندرويد أولاً، مرونة كاملة، ودعم لـ 30 موديول ديناميكي

const { useState, useEffect } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    useEffect(() => {
        db.init().then(() => setIsReady(true)).catch(err => alert("خطأ في القاعدة: " + err));
    }, []);

    // القائمة الشاملة لجميع موديولات إكس القابضة (مرتبة حسب استراتيجية الدومينو)
    const menuGroups = [
        {
            group: "الرؤية والقيادة",
            items: [
                { id: 'dashboard', label: 'لوحة التحكم', icon: '📊' },
                { id: 'stats_adv', label: 'إحصائيات متقدمة', icon: '📈' },
            ]
        },
        {
            group: "الائتمان والعملاء",
            items: [
                { id: 'crm', label: 'العملاء والائتمان', icon: '👥' },
                { id: 'survey', label: 'الاستعلام الميداني', icon: '📍' },
            ]
        },
        {
            group: "المخازن والمبيعات",
            items: [
                { id: 'inventory', label: 'المخزن والجرد', icon: '📦' },
                { id: 'pos', label: 'نقطة البيع (POS)', icon: '🛒' },
                { id: 'invoices', label: 'الفواتير والمرتجعات', icon: '🧾' },
            ]
        },
        {
            group: "المالية والتحصيل",
            items: [
                { id: 'collection', label: 'وحدة التحصيل', icon: '💰' },
                { id: 'treasury', label: 'الخزينة والوردية', icon: '🏦' },
            ]
        },
        {
            group: "الشؤون القانونية",
            items: [
                { id: 'legal', label: 'القضايا والنزاعات', icon: '⚖️' },
            ]
        },
        {
            group: "مركز البيانات",
            items: [
                { id: 'data_import', label: 'استيراد البيانات', icon: '📥' },
                { id: 'data_mapping', label: 'توافق الأعمدة', icon: '🔗' },
                { id: 'reports_adv', label: 'تقارير متقدمة', icon: '📑' },
            ]
        },
        {
            group: "الإدارة والنظام",
            items: [
                { id: 'hr', label: 'شؤون الموظفين', icon: '👔' },
                { id: 'settings', label: 'إعدادات عامة', icon: '⚙️' },
                { id: 'settings_adv', label: 'إعدادات متقدمة', icon: '🛠️' },
            ]
        }
    ];

    // محرك عرض الموديولات الديناميكي (X-Renderer)
    const renderModule = (id) => {
        const moduleMap = {
            'crm': typeof CRMModule !== 'undefined' ? <CRMModule /> : null,
            'inventory': typeof InventoryModule !== 'undefined' ? <InventoryModule /> : null,
            'pos': typeof POSModule !== 'undefined' ? <POSModule /> : null,
            'collection': typeof CollectionModule !== 'undefined' ? <CollectionModule /> : null,
            'legal': typeof LegalModule !== 'undefined' ? <LegalModule /> : null,
            'data_import': typeof ImportModule !== 'undefined' ? <ImportModule /> : null,
            // سيتم إضافة باقي الموديولات هنا بمجرد برمجتها
        };

        if (id === 'dashboard') return <DashboardView />;
        
        const SelectedModule = moduleMap[id];
        if (SelectedModule) return <div className="animate-in fade-in duration-500">{SelectedModule}</div>;

        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-6xl mb-4 opacity-20">🏗️</div>
                <h3 className="font-black text-slate-800">موديول [{id.toUpperCase()}]</h3>
                <p className="text-sm mt-2">هذا الجزء قيد التجهيز في ملف منفصل (استراتيجية الدومينو)</p>
                <div className="mt-4 px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    Waiting for {id}.js
                </div>
            </div>
        );
    };

    if (!isReady) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="h-screen bg-slate-100 flex overflow-hidden font-sans" dir="rtl">
            
            {/* الهيدر الثابت (Mobile-First) */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-700">
                    <span className="text-2xl">☰</span>
                </button>
                <h2 className="mr-3 text-md font-black text-slate-800 truncate">EcoFine Pro <span className="text-blue-600 text-[10px] mr-1">V4</span></h2>
                <div className="mr-auto flex items-center gap-2">
                    <span className="hidden sm:block text-[10px] font-black bg-slate-100 px-2 py-1 rounded-md text-slate-500">{activeTab.toUpperCase()}</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-blue-200">X</div>
                </div>
            </header>

            {/* القائمة الجانبية الذكية */}
            <aside className={`fixed inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-400 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">X</div>
                        <span className="text-white font-bold text-sm tracking-tighter">إكس القابضة</span>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="text-xl">✕</button>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scroll">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 pr-2">{group.group}</h4>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-slate-200'}`}
                                    >
                                        <span className="text-lg">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* خلفية التظليل */}
            {isMenuOpen && <div className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>}

            {/* منطقة العمل الأساسية */}
            <main className="flex-1 pt-16 overflow-y-auto w-full">
                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                    {renderModule(activeTab)}
                </div>
            </main>
        </div>
    );
};

// موديول لوحة التحكم (داشبورد) مدمج للسرعة
const DashboardView = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">المبيعات</p>
                <h3 className="text-xl font-black text-slate-800">0.00 <span className="text-xs font-normal">ج.م</span></h3>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">التحصيل</p>
                <h3 className="text-xl font-black text-green-600">0.00 <span className="text-xs font-normal">ج.م</span></h3>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">المتأخرات</p>
                <h3 className="text-xl font-black text-red-600">0.00 <span className="text-xs font-normal text-slate-400">ج.م</span></h3>
            </div>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">العملاء</p>
                <h3 className="text-xl font-black text-blue-600">0 <span className="text-xs font-normal text-slate-400">نشط</span></h3>
            </div>
        </div>
        <div className="h-64 bg-white rounded-3xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold">
            [مخطط بياني للأداء قريباً]
        </div>
    </div>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
