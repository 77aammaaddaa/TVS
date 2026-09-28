import { useState, useEffect, useMemo } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { scanSystemHealth, markAsRead, markAllAsRead } from "@/lib/notifications"

export default function NotificationsPage() {
    const [alerts, setAlerts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"unread" | "all">("unread")

    const loadAlerts = async () => {
        setLoading(true)
        try {
        // AI-Ops scanning is now disabled outside backend services
        const session = JSON.parse(localStorage.getItem("ecofine_session") || "{}")
        if (session?.id) {
            await scanSystemHealth(session.id)
        }
        const data: any[] = []
        setAlerts((data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        } catch (err) {
        console.error(err)
        } finally {
        setLoading(false)
        }
    }

    useEffect(() => {
        loadAlerts()
    }, [])

    const filteredAlerts = useMemo(() => {
        if (filter === "unread") return alerts.filter(a => !a.is_read)
        return alerts
    }, [alerts, filter])

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id)
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    }

    const handleMarkAllAsRead = async () => {
        const session = JSON.parse(localStorage.getItem("ecofine_session") || "{}")
        if (session?.id) {
        await markAllAsRead(session.id)
        loadAlerts()
        }
    }

    const getAlertStyle = (type: string, isRead: boolean) => {
        const base = "p-5 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        if (isRead) return `${base} bg-gray-50 border-gray-200 opacity-60`
        if (type === "critical") return `${base} bg-red-50 border-red-200`
        if (type === "warning") return `${base} bg-amber-50 border-amber-200`
        return `${base} bg-blue-50 border-blue-200`
    }

    if (loading) {
        return (
        <div className="flex items-center justify-center h-64">
            <span className="text-gray-400 animate-pulse">جاري فحص النظام وجمع التنبيهات...</span>
        </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto font-sans space-y-6" dir="rtl">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-800 text-white rounded-2xl flex items-center justify-center text-2xl shadow relative">
                <Bell className="w-6 h-6" />
                {alerts.filter(a => !a.is_read).length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-bold border-2 border-white">
                    {alerts.filter(a => !a.is_read).length}
                </span>
                )}
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800">مركز المراقبة والتنبيهات</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">ذكاء اصطناعي تشغيلي (AI-Ops)</p>
            </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
            <div className="flex bg-gray-100 p-1.5 rounded-xl w-full md:w-auto">
                <button
                onClick={() => setFilter("unread")}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-semibold transition-all ${filter === "unread" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                >
                الجديد 🔴
                </button>
                <button
                onClick={() => setFilter("all")}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-semibold transition-all ${filter === "all" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}
                >
                الأرشيف 🗄️
                </button>
            </div>
            {filter === "unread" && filteredAlerts.length > 0 && (
                <button
                onClick={handleMarkAllAsRead}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow transition-colors whitespace-nowrap flex items-center gap-1"
                >
                <CheckCheck className="w-4 h-4" />
                الكل مقروء
                </button>
            )}
            </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
            {filteredAlerts.map(alert => (
            <div key={alert.id} className={getAlertStyle(alert.type, alert.is_read)}>
                <div className="flex items-start gap-4">
                <span className="text-2xl mt-1">
                    {alert.type === "critical" ? "🚨" : alert.type === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <div>
                    <h4 className="font-bold text-sm mb-1">{alert.title}</h4>
                    <p className="text-xs font-medium leading-relaxed opacity-90">{alert.message}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-widest mt-2 opacity-60" dir="ltr">
                    {new Date(alert.created_at).toLocaleString("ar-EG")}
                    </p>
                </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto shrink-0 mt-4 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-gray-200">
                {!alert.is_read && (
                    <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="flex-1 md:flex-none px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors border border-gray-200"
                    >
                    تأكيد المعرفة ✔️
                    </button>
                )}
                {alert.link && (
                    <a
                    href={alert.link}
                    className="flex-1 md:flex-none px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors text-center"
                    >
                    اتخاذ إجراء ➔
                    </a>
                )}
                </div>
            </div>
            ))}

            {filteredAlerts.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-200">
                <span className="text-5xl mb-4 opacity-50">✨</span>
                <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">النظام مستقر تماماً</p>
                <p className="text-xs font-medium text-gray-400 mt-2">لا توجد نواقص حرجة أو عملاء متأخرين حالياً.</p>
            </div>
            )}
        </div>
        </div>
    )
}