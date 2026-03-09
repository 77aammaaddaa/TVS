// app.js - المايسترو (النسخة الموحدة والمرنة لكل الشاشات)
// التركيز: الأندرويد والموبايل أولاً (Mobile-First)

const { useState, useEffect } = React;

const App = () => {
    const [isReady, setIsReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false); // حالة واحدة للمنيو في كل الأجهزة
    const [user] = useState({ name: 'مستر إكس', role: 'CEO' });

    useEffect(() => {
        db.init().then(() => setIsReady(true)).catch(err => alert("خطأ: " + err));
    }, []);

    if (!isReady) return (
        <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-bold">EcoFine Pro V4...</p>
            </div>
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

    const navigateTo = (id) => {
        setActiveTab(id);
        setIsMenuOpen(false); // قفل المنيو بعد الاختيار فوراً
    };

    return (
        <div className="h-screen bg-slate-100 flex overflow-hidden font-sans" dir="rtl">
            
            {/* زر المنيو (الهامبرجر) - ثابت في الهيدر لكل الأجهزة */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center px-4 z-40 shadow-sm">
                <button 
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                >
                    <span className="text-2xl">☰</span>
                </button>
                <h2 className="mr-4 text-lg font-black text-slate-800 truncate">
                    {menuItems.find(i => i.id === activeTab)?.label}
                </h2>
                <div className="mr-auto flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">X</div>
                </div>
            </header>

            {/* القائمة المسحوبة (الدرج) - تظهر من اليمين فوق المحتوى */}
            <aside className={`
                fixed inset-y-0 right-0 z-[100] w-72 bg-slate-900 text-slate-300 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-in-out
                ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xl">X</div>
                        <h1 className="text-white font-bold">إكس القابضة</h1>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="text-2xl text-slate-500 hover:text-white">✕</button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => navigateTo(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'
                            }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>
                
                <div className="p-4 border-t border-slate-800 text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest">
                    EcoFine Pro v4 | Mobile First
                </div>
            </aside>

            {/* خلفية تظليل عند فتح المنيو (Overlay) */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-sm"
                    onClick={() => setIsMenuOpen(false)}
                ></div>
            )}

            {/* منطقة المحتوى - تبدأ تحت الهيدر */}
            <main className="flex-1 pt-16 overflow-y-auto w-full">
                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                    {/* الموديولات */}
                    {activeTab === 'crm' && (
                        <div className="animate-in fade-in duration-500">
                            <CRMModule />
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                                <p className="text-slate-400 text-xs font-bold mb-1">إجمالي المبيعات</p>
                                <h3 className="text-2xl font-black text-slate-800">0.00 <span className="text-xs">ج.م</span></h3>
                            </div>
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                                <p className="text-slate-400 text-xs font-bold mb-1">تحصيل اليوم</p>
                                <h3 className="text-2xl font-black text-green-600">0.00 <span className="text-xs text-slate-400">ج.م</span></h3>
                            </div>
                        </div>
                    )}

                    {!['dashboard', 'crm'].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="text-5xl mb-4">⚙️</div>
                            <p className="font-bold">الموديول قيد التجهيز</p>
                            <p className="text-xs mt-2 italic text-slate-300">استراتيجية الدومينو للمحترف إكس</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
