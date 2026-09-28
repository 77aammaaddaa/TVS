import { useState, useEffect } from "react"
import { ClipboardList, Trash2, Clock, LogIn, LogOut } from "lucide-react"

export default function AttendancePage() {
    const [logs, setLogs] = useState<any[]>([])
    const [form, setForm] = useState({ name: '', type: 'حضور' })

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        setLogs([])
    }

    const addLog = async (e: React.FormEvent) => {
        e.preventDefault()
        alert("تم إزالة ميزة سجل الحضور غير المتصلة. لا يمكن إضافة سجل حالياً.")
        setForm({ name: '', type: 'حضور' })
    }

    const deleteLog = async (id: string) => {
        alert("تم إزالة ميزة سجل الحضور غير المتصلة. لا يمكن حذف السجل حالياً.")
    }

    return (
        <div className="p-6 max-w-4xl mx-auto font-sans" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <ClipboardList className="text-blue-600" />
                        سجل الحضور والانصراف
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة أوقات الدخول والخروج لفريق العمل</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Clock size={20} className="text-gray-400" />
                            تسجيل جديد
                        </h2>
                        <form onSubmit={addLog} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم الموظف</label>
                                <input
                                    type="text"
                                    placeholder="أدخل الاسم"
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع الحركة</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    <option value="حضور">حضور</option>
                                    <option value="انصراف">انصراف</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors mt-2">
                                تسجيل الحركة
                            </button>
                        </form>
                    </div>
                </div>

                {/* Logs Section */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-sm">سجل الحركات الأخير</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {logs.map((log, idx) => (
                                <div key={log.id || idx} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{log.name}</p>
                                        <p className="text-xs text-gray-500 mt-1" dir="ltr">{new Date(log.timestamp).toLocaleString('ar-EG')}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${log.type === 'حضور' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {log.type === 'حضور' ? <LogIn size={14} /> : <LogOut size={14} />}
                                            {log.type}
                                        </span>
                                        <button onClick={() => deleteLog(log.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="حذف السجل">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    لا توجد سجلات حضور وانصراف حتى الآن
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}