// app.js - المايسترو (نسخة الأيقونات الذكية والمتوافقة مع الهاتف)
// تصميم: X-Holding V4 | الهيكل: استراتيجية الدومينو

const { useState, useEffect } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(true); // الكمبيوتر: أيقونات فقط افتراضياً
    const [isMobileOpen, setIsMobileOpen] = useState(false); // الموبايل: مخفي افتراضياً
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    useEffect(() => {
        db.init().then(() => setIsReady(true)).catch(err => alert("خطأ: " + err));
    }, []);

    if (!isReady) return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
        </div>
    );

    const menuItems = [
        { id: 'dashboard', label: 'الرؤية العامة', icon: '📊' },
        { id: 'crm', label: 'إدارة العملاء', icon: '👥' },
        { id: 'inventory', label: 'المخازن', icon: '📦' },
        { id: 'pos', label: 'نقطة البيع', icon: '🛒' },
        { id: 'collection', label: 'التحصيلات', icon: '💰' },
        { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' },
        { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
    ];

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans" dir="rtl">
            
            {/* 1. الطبقة الشفافة للموبايل (Overlay) */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                ></div>
            )}

            {/* 2. القائمة الجانبية (الذكية) */}
            <aside className={`
                fixed inset-y-0 right-0 z-50 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 shadow-2xl
                lg:relative lg:translate-x-0
                ${isMobileOpen ? 'translate-x-0 w-64' : 'translate-x-full lg:translate-x-0'}
                ${!isMobileOpen && isCollapsed ? 'lg:w-20' : 'lg:w-64'}
            `}>
                {/* رأس القائمة - اللوجو */}
                <div className="h-16 flex items-center px-4 border-b border-slate-800 overflow-hidden">
                    <div className="min-w-[40px] w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg">X</div>
                    <span className={`mr-4 font-black text-white transition-opacity duration-300 ${isCollapsed && !isMobileOpen ? 'lg:opacity-0' : 'opacity-100'}`}>
                        EcoFine Pro
                    </span>
                </div>

                {/* روابط التنقل */}
                <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scroll">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMobileOpen(false); }}
                            className={`
                                w-full flex items-center h-12 rounded-xl transition-all group relative
                                ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}
                                ${isCollapsed && !isMobileOpen ? 'justify-center' : 'px-4'}
                            `}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className={`mr-4 font-bold whitespace-nowrap transition-all duration-300 
                                ${isCollapsed && !isMobileOpen ? 'lg:hidden' : 'block'}`}>
                                {item.label}
                            </span>
                            
                            {/* تلميح (Tooltip) يظهر فقط عند التصغير */}
                            {isCollapsed && !isMobileOpen && (
                                <div className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* زرار التحكم في التصغير (للكمبيوتر فقط) */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex h-12 items-center justify-center border-t border-slate-800 hover:bg-slate-800 transition-colors"
                >
                    {isCollapsed ? '⬅️' : '➡️'}
                </button>
            </aside>

            {/* 3. منطقة المحتوى الأساسية */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-4 lg:px-6">
                    <div className="flex items-center gap-4">
                        {/* زرار الهامبرجر (للموبايل فقط) */}
                        <button 
                            onClick={() => setIsMobileOpen(true)}
                            className="lg:hidden p-2 text-slate-600 text-2xl"
                        >
                            ☰
                        </button>
                        <h2 className="text-lg font-black text-slate-800">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-black text-slate-800 leading-none">{user.name}</p>
                            <p className="text-[10px] text-blue-600 font-bold uppercase">{user.role}</p>
                        </div>
                        <div className="w-9 h-9 bg-slate-200 rounded-xl border-2 border-white shadow-sm overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400"></div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {/* الموديلات */}
                    <div className="max-w-7xl mx-auto">
                        {activeTab === 'dashboard' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card title="مبيعات اليوم" value="24,500" color="blue" />
                                <Card title="تحصيلات اليوم" value="12,200" color="green" />
                                <Card title="عملاء خطر" value="3" color="red" />
                                <Card title="الخزينة" value="150,000" color="slate" />
                            </div>
                        )}
                        
                        {activeTab === 'crm' && <CRMModule />}
                        
                        {/* باقي الموديلات تركب هنا */}
                        {!['dashboard', 'crm'].includes(activeTab) && (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <span className="text-5xl mb-4">🏗️</span>
                                <p className="font-bold">هذا الموديول قيد التجهيز في استراتيجية الدومينو</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

// مكون البطاقة السريع للإحصائيات
const Card = ({ title, value, color }) => {
    const colors = {
        blue: 'border-blue-600 text-blue-600',
        green: 'border-green-600 text-green-600',
        red: 'border-red-600 text-red-600',
        slate: 'border-slate-800 text-slate-800'
    };
    return (
        <div className={`bg-white p-5 rounded-2xl shadow-sm border-t-4 ${colors[color]}`}>
            <p className="text-slate-500 font-bold text-xs mb-1">{title}</p>
            <h3 className="text-xl font-black">{value} <span className="text-[10px] text-slate-400">ج.م</span></h3>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
