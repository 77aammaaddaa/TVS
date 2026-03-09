// app.js - المايسترو (نسخة الزر العائم والتحكم الكامل)

const { useState, useEffect } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // التحكم في ظهور القائمة
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
        <div className="h-screen bg-slate-100 flex overflow-hidden font-sans" dir="rtl">
            
            {/* 1. زر المنيو العائم (يظهر في الموبايل والكمبيوتر عند الحاجة) */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="fixed bottom-6 left-6 z-[60] w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl lg:hidden"
            >
                {isMenuOpen ? '✕' : '☰'}
            </button>

            {/* 2. القائمة الجانبية (Drawer System) */}
            <aside className={`
                fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 shadow-2xl
                lg:static lg:translate-x-0
                ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xl">X</div>
                    <h1 className="text-white font-bold">EcoFine Pro</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'
                            }`}
                        >
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* 3. منطقة المحتوى الأساسية */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* هيدر بسيط */}
                <header className="h-16 bg-white border-b flex justify-between items-center px-6">
                    <div className="flex items-center gap-4">
                        {/* زر منيو إضافي في الهيدر للكمبيوتر */}
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="hidden lg:block text-slate-600">☰</button>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">{user.role}</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {/* مديول الـ CRM سيظهر هنا فور اختياره */}
                    {activeTab === 'crm' && (
                        <div className="animate-fade-in">
                            <CRMModule />
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-blue-600">
                                <p className="text-slate-400 text-xs font-bold">إجمالي المبيعات</p>
                                <h3 className="text-xl font-black">0.00 ج.م</h3>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-600">
                                <p className="text-slate-400 text-xs font-bold">تحصيلات اليوم</p>
                                <h3 className="text-xl font-black">0.00 ج.م</h3>
                            </div>
                        </div>
                    )}

                    {/* باقي الموديولات */}
                    {!['dashboard', 'crm'].includes(activeTab) && (
                        <div className="text-center py-20 text-slate-400">
                            <p className="text-4xl mb-4">🚧</p>
                            <p className="font-bold">قيد التنفيذ حسب استراتيجية الدومينو</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
