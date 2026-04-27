/* attendance.js - إدارة تسجيل الحضور والإنصراف */

const { useState, useEffect } = React;

const AttendanceModule = () => {
    const [formData, setFormData] = useState({ name: '', type: '' });
    const [logs, setLogs] = useState([]);

    // 📥 تحميل البيانات من Local Storage عند بدء الموديول
    useEffect(() => {
        const savedLogs = localStorage.getItem('attendance_logs') || '[]';
        setLogs(JSON.parse(savedLogs));
    }, []);

    // 🔧 تحديث Local Storage عند تعديل البيانات
    useEffect(() => {
        localStorage.setItem('attendance_logs', JSON.stringify(logs));
    }, [logs]);

    // 📄 إضافة سجل جديد
    const addLog = () => {
        if (formData.name && formData.type) {
            setLogs([...logs, { ...formData, timestamp: new Date().toISOString() }]);
            setFormData({ name: '', type: '' });
        }
    };

    // 📄 حذف سجل
    const deleteLog = (index) => {
        const updatedLogs = [...logs];
        updatedLogs.splice(index, 1);
        setLogs(updatedLogs);
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 w-full mx-auto max-w-md text-center mt-4">
            <h2 className="text-xl font-black mb-4">سجل الحضور والإنصراف</h2>
            <form onSubmit={(e) => { e.preventDefault(); addLog() }} className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-3">
                    <p className="text-[10px] font-bold text-blue-800 leading-relaxed">
                        📜 أدخل بيانات الحضور/الانصراف واطبع التاريخ الزمني
                    </p>
                </div>
                <input 
                    type="text" 
                    id="name" 
                    placeholder="اسم العامل" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm mb-3" 
                />
                <select 
                    id="type" 
                    required 
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm mb-3"
                >
                    <option value="حضور">حضور</option>
                    <option value="انصراف">انصراف</option>
                </select>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-xl transition-colors active:scale-95">تسجيل</button>
            </form>

            <div className="mt-6">
                <h3 className="text-lg font-black mb-2">سجل الحضور</h3>
                <ul className="space-y-2">
                    {logs.map((log, index) => (
                        <li key={index} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex justify-between items-center">
                            <div>
                                <span>{log.name}</span> -
                                <span className="text-[10px] font-bold text-slate-700"> {log.type === 'حضور' ? 'حضور' : 'انصراف'} </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => deleteLog(index)} className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-xs font-bold">حذف</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

window.AttendanceModule = AttendanceModule;
