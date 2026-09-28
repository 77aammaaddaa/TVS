import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Monitor,
    Wallet,
    Package,
    FileText,
    Settings,
    ShieldCheck,
    UserCog,
    Briefcase,
    Clock,
    Scale,
    Bell,
    LogOut,
    User as UserIcon,
    Menu,
    X,
    ShoppingCart,
    Truck,
    Database,
    Handshake,
    ClipboardList,
    Timer,
    Wallet2Icon,
    Crown,
    Landmark,
    Receipt
} from "lucide-react";
import type { User } from "@/types/auth";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
} from "@/lib/notifications";

interface SidebarProps {
    user: User;
    onLogout: () => void;
}

// ---------------------------------------------------------------------------
// Redrafted & Logically Grouped Modules
// ---------------------------------------------------------------------------
const menuGroups = [
    {
        group: "القيادة والتقارير",
        items: [
            { path: "/", label: "الصفحة الرئيسية", icon: LayoutDashboard, moduleKey: "dashboard" },
            { path: "/golden", label: "اللوحة الذهبية", icon: Crown, moduleKey: "dashboard", ownerOnly: true },
            { path: "/reports", label: "التقارير والإحصائيات", icon: FileText, moduleKey: "reports" },
        ],
    },
    {
        group: "المبيعات والعملاء",
        items: [
            { path: "/pos", label: "نقطة البيع", icon: Monitor, moduleKey: "pos" },
            { path: "/crm", label: "إدارة العملاء", icon: Users, moduleKey: "crm" },
        ],
    },
    {
        group: "التحصيل والميدان",
        items: [
            { path: "/collection", label: "إدارة الأقساط والتحصيل", icon: Wallet, moduleKey: "collection" },
            { path: "/wallets", label: "محافظ المحصلين", icon: Wallet2Icon, moduleKey: "wallets" },
            { path: "/surveys", label: "الإستعلام الميداني", icon: ClipboardList, moduleKey: "surveys" },
        ],
    },
    {
        group: "المشتريات والمخازن",
        items: [
            { path: "/inventory", label: "المخزن والجرد", icon: Package, moduleKey: "inventory" },
            { path: "/purchases", label: "فواتير المشتريات", icon: ShoppingCart, moduleKey: "purchases" },
            { path: "/suppliers", label: "إدارة الموردين", icon: Truck, moduleKey: "suppliers" },
        ],
    },
    {
        group: "المالية والخزائن",
        items: [
            { path: "/shifts", label: "إدارة الورديات", icon: Timer, moduleKey: "shifts" },
            { path: "/vaults", label: "إدارة الخزائن الرئيسية", icon: Landmark, moduleKey: "vaults" },
            { path: "/expenses", label: "المصروفات والعهد", icon: Receipt, moduleKey: "expenses" },
            { path: "/partners", label: "الشركاء والأرباح", icon: Handshake, moduleKey: "partners", ownerOnly: true },
        ],
    },
    {
        group: "الموارد البشرية",
        items: [
            { path: "/users", label: "الموظفين والصلاحيات", icon: UserCog, moduleKey: "users", ownerOnly: true },
            { path: "/hr", label: "نقاط الأداء والرواتب", icon: Briefcase, moduleKey: "hr" },
            { path: "/attendance", label: "الحضور والإنصراف", icon: Clock, moduleKey: "attendance" },
        ],
    },
    {
        group: "الشؤون القانونية",
        items: [
            { path: "/legal", label: "القضايا والمستندات", icon: Scale, moduleKey: "legal" },
        ],
    },
    {
        group: "النظام والإعدادات",
        items: [
            { path: "/settings", label: "الإعدادات العامة", icon: Settings, moduleKey: "settings" },
            { path: "/audit", label: "سجل المراقبة الأمني", icon: ShieldCheck, moduleKey: "settings", ownerOnly: true },
            { path: "/data-bridge", label: "جسر البيانات المركزية", icon: Database, moduleKey: "settings", ownerOnly: true },
        ],
    },
] as const;

export default function Sidebar({ user, onLogout }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showDropdown, setShowDropdown] = useState(false);
    
    const bellRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const isOwner = user.role === "OWNER";
    const userPermissions = user.permissions || [];

    const visibleMenuGroups = menuGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (isOwner) return !("ownerOnly" in item) || true;
                if ("ownerOnly" in item && item.ownerOnly) return false;
                return userPermissions.includes(item.moduleKey);
            }),
        }))
        .filter((group) => group.items.length > 0);

    // Clock update
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Notifications
    const loadNotifications = async () => {
        if (user?.id) {
            const notifs = await getNotifications(user.id);
            setNotifications(notifs.slice(0, 5));
            setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
        }
    };

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60_000);
        return () => clearInterval(interval);
    }, [user]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                bellRef.current && !bellRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-close mega menu when navigation occurs
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    return (
        <header className="bg-slate-900 text-slate-300 w-full shrink-0 border-b border-slate-800 z-50 relative">
            {/* Main Top Bar */}
            <div className="flex items-center justify-between px-4 lg:px-6 h-16">
                
                {/* Right Side: Brand & Menu Toggle */}
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="p-2 bg-slate-800 rounded-xl hover:bg-blue-600 hover:text-white transition-colors text-slate-300 shadow-sm"
                        title="القائمة الرئيسية"
                    >
                        {isMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block">
                            <h2 className="text-white font-black text-xl tracking-tighter">
                                Eco Fine <span className="text-blue-500">Pro</span>
                            </h2>
                            <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                                Enterprise V15
                            </p>
                        </div>
                    </div>
                </div>

                {/* Left Side: Utils (Clock, User, Notifications, Logout) */}
                <div className="flex items-center gap-4 lg:gap-6">
                    {/* Clock (Hidden on very small screens) */}
                    <div className="hidden md:flex items-center gap-4 text-xs border-l border-slate-800 pl-4 lg:pl-6">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-4 h-4" />
                            <span className="font-mono text-[11px]" dir="ltr">
                                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                        </div>
                    </div>

                    {/* User Profile */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-semibold text-slate-200">{user.username}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase">{user.role}</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm shrink-0">
                            {user.username?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                        <button
                            ref={bellRef}
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors"
                        >
                            <Bell className="w-4 h-4 text-slate-400" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold shadow-[0_0_0_2px_#0f172a]">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={onLogout}
                            className="p-2 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                            title="تسجيل الخروج"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Dropdown */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute left-4 top-14 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto text-slate-800"
                    style={{ direction: "rtl" }}
                >
                    <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-black text-sm text-slate-800">الإشعارات</h4>
                        <button
                            onClick={async () => {
                                if (user?.id) {
                                    await markAllAsRead(user.id);
                                    loadNotifications();
                                }
                            }}
                            className="text-xs text-blue-600 font-bold hover:underline"
                        >
                            تعليم الكل كمقروء
                        </button>
                    </div>
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm font-semibold text-slate-400 flex flex-col items-center gap-2">
                            <Bell className="w-8 h-8 text-slate-200" />
                            لا توجد إشعارات جديدة
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${
                                    !n.is_read ? "bg-blue-50/50" : ""
                                }`}
                                onClick={async () => {
                                    if (!n.is_read) {
                                        await markAsRead(n.id);
                                        loadNotifications();
                                    }
                                    if (n.link) navigate(n.link);
                                    setShowDropdown(false);
                                }}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <span className="text-sm font-bold text-slate-800 leading-tight">{n.title}</span>
                                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                                        {new Date(n.created_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {n.message && (
                                    <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">{n.message}</p>
                                )}
                            </div>
                        ))
                    )}
                    <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { navigate('/notifications'); setShowDropdown(false); }}>
                        <span className="text-xs text-blue-600 font-black">عرض كل الإشعارات</span>
                    </div>
                </div>
            )}

            {/* Expandable Mega-Menu Tab */}
            <div 
                ref={menuRef}
                className={`absolute top-16 right-0 w-full bg-slate-900 border-t border-slate-800 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden z-40 ${
                    isMenuOpen ? 'max-h-[calc(100vh-4rem)] opacity-100 visible' : 'max-h-0 opacity-0 invisible'
                }`}
            >
                <div className="max-w-7xl mx-auto p-6 md:p-8">
                    <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10 custom-scroll overflow-y-auto max-h-[calc(100vh-8rem)]">
                        {visibleMenuGroups.map((group, idx) => (
                            <div key={idx} className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">
                                    {group.group}
                                </h4>
                                <div className="flex flex-col gap-1.5">
                                    {group.items.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                    isActive
                                                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                                }`
                                            }
                                        >
                                            <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-white' : 'text-slate-500'}`} />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
            </div>
            
            {/* Backdrop for Mega Menu */}
            {isMenuOpen && (
                <div 
                    className="fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-sm z-30" 
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </header>
    );
}