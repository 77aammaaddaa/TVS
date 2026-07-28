// hr.js - مديول شؤون الموظفين ونظام النقاط (إصدار إكس القابضة V6)

const ATTENDANCE_STORAGE_KEY = 'ecofine_attendance_logs';
const ATTENDANCE_SETTINGS_KEY = 'ecofine_attendance_settings';

function getAttendanceSettings() {
    try {
        const saved = localStorage.getItem(ATTENDANCE_SETTINGS_KEY);
        if (!saved) return { lat: 30.0444, lng: 31.2357, radius: 200 };
        const parsed = JSON.parse(saved);
        return { lat: Number(parsed.lat) || 30.0444, lng: Number(parsed.lng) || 31.2357, radius: Number(parsed.radius) || 200 };
    } catch {
        return { lat: 30.0444, lng: 31.2357, radius: 200 };
    }
}

function saveAttendanceSettings(settings) {
    localStorage.setItem(ATTENDANCE_SETTINGS_KEY, JSON.stringify(settings));
}

function getAttendanceLogs() {
    try {
        return JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveAttendanceLogs(logs) {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(logs));
}

function toRadians(value) {
    return value * (Math.PI / 180);
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

const HRModule = ({ initialView = 'list' }) => {
    const [employees, setEmployees] = React.useState([]);
    const [points, setPoints] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState(initialView === 'attendance' ? 'attendance' : 'list');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    
    const [empForm, setEmpForm] = React.useState({ name: '', role: '', base_salary: 0, point_value: 10 });
    const [pointForm, setPointForm] = React.useState({ emp_id: '', type: 'plus', amount: '', reason: '' });
    const [attendanceStats, setAttendanceStats] = React.useState({ total: 0, approved: 0, outside: 0, latest: null });
    const [attendanceForm, setAttendanceForm] = React.useState({ employeeId: '', type: 'حضور' });
    const [attendanceSettings, setAttendanceSettings] = React.useState(getAttendanceSettings());
    const [attendanceStatus, setAttendanceStatus] = React.useState('جارٍ التحقق من الموقع...');
    const [attendancePosition, setAttendancePosition] = React.useState(null);
    const [isSubmittingAttendance, setIsSubmittingAttendance] = React.useState(false);

    const loadAttendanceStats = React.useCallback(() => {
        const logs = getAttendanceLogs();
        const approved = logs.filter(log => log.status === 'approved').length;
        const outside = logs.filter(log => log.status === 'outside_range').length;
        const latest = logs[0] || null;
        setAttendanceStats({ total: logs.length, approved, outside, latest });
    }, []);

    const loadData = React.useCallback(async () => {
        const [e, p] = await Promise.all([db.getAll('employees'), db.getAll('salary_points')]);
        setEmployees(e || []);
        setPoints(p || []);
        loadAttendanceStats();
    }, [loadAttendanceStats]);

    const requestAttendanceLocation = React.useCallback(() => {
        if (!navigator.geolocation) {
            setAttendanceStatus('الموقع غير مدعوم في هذا المتصفح.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setAttendancePosition(position.coords);
                setAttendanceStatus(`تم تحديد الموقع بنجاح: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
            },
            (error) => {
                let message = 'تعذر الوصول إلى الموقع. يرجى السماح بالإذن.';
                if (error.code === 1) message = 'تم رفض إذن الموقع.';
                if (error.code === 2) message = 'تعذر تحديد الموقع حاليًا.';
                setAttendanceStatus(message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    React.useEffect(() => { loadData(); }, [loadData]);
    React.useEffect(() => { if (activeTab === 'attendance') requestAttendanceLocation(); }, [activeTab, requestAttendanceLocation]);

    // 1. إضافة موظف
    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        await db.add('employees', empForm);
        setIsModalOpen(false);
        setEmpForm({ name: '', role: '', base_salary: 0, point_value: 10 });
        loadData();
        alert("✅ تم تسجيل الموظف في القوة الضاربة");
    };

    // 2. إضافة نقاط (مكافأة أو جزاء)
    const handleAddPoints = async (e) => {
        e.preventDefault();
        const emp = employees.find(x => x.id === pointForm.emp_id);
        const pointValue = Number(emp.point_value || 10);
        const cashImpact = Number(pointForm.amount) * pointValue * (pointForm.type === 'plus' ? 1 : -1);

        await db.add('salary_points', {
            ...pointForm,
            cash_impact: cashImpact,
            date: new Date().toISOString()
        });
        
        setPointForm({ emp_id: '', type: 'plus', amount: '', reason: '' });
        loadData();
        alert("✅ تم تحديث ميزان الأداء للموظف");
    };

    const handleAttendanceSubmit = async (e) => {
        e.preventDefault();
        const employee = employees.find(item => item.id === attendanceForm.employeeId);
        const employeeName = employee?.name || employee?.full_name || employee?.username;
        if (!employeeName) {
            setAttendanceStatus('يرجى اختيار موظف من القائمة.');
            return;
        }
        if (!attendancePosition) {
            setAttendanceStatus('يرجى الانتظار حتى يتم تحديد الموقع.');
            return;
        }

        setIsSubmittingAttendance(true);
        const distance = calculateDistanceMeters(attendanceSettings.lat, attendanceSettings.lng, attendancePosition.latitude, attendancePosition.longitude);
        const isApproved = distance <= attendanceSettings.radius;

        const newLog = {
            name: employeeName,
            type: attendanceForm.type,
            timestamp: new Date().toISOString(),
            latitude: attendancePosition.latitude,
            longitude: attendancePosition.longitude,
            distanceMeters: Math.round(distance),
            status: isApproved ? 'approved' : 'outside_range'
        };

        const logs = [newLog, ...getAttendanceLogs()].slice(0, 20);
        saveAttendanceLogs(logs);
        loadAttendanceStats();
        setAttendanceForm({ employeeId: '', type: 'حضور' });
        setAttendanceStatus(isApproved ? `تم تسجيل ${attendanceForm.type} بنجاح داخل النطاق (${Math.round(distance)} متر).` : `تم تسجيل ${attendanceForm.type} لكن الموقع خارج النطاق (${Math.round(distance)} متر).`);
        setIsSubmittingAttendance(false);
    };

    const handleAttendanceSettingsSave = (e) => {
        e.preventDefault();
        const settings = {
            lat: Number(attendanceSettings.lat),
            lng: Number(attendanceSettings.lng),
            radius: Number(attendanceSettings.radius)
        };
        saveAttendanceSettings(settings);
        setAttendanceSettings(settings);
        setAttendanceStatus('تم حفظ إعدادات الموقع بنجاح.');
    };

    // حساب الراتب المستحق حالياً
    const calculateSalary = (empId, base) => {
        const empPoints = points.filter(p => p.emp_id === empId);
        const adjustments = empPoints.reduce((sum, p) => sum + p.cash_impact, 0);
        return Number(base) + adjustments;
    };

    return (
        <div className="space-y-6 pb-20">
            {/* التبويبات */}
            <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
                <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>فريق العمل</button>
                <button onClick={() => setActiveTab('points')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'points' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>نظام النقاط</button>
                <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'attendance' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>الحضور والإنصراف</button>
            </div>

            {activeTab === 'list' ? (
                <div className="space-y-4 animate-in fade-in">
                    <button onClick={() => setIsModalOpen(true)} className="w-full p-4 bg-blue-600 text-white rounded-3xl font-black shadow-lg shadow-blue-100">+ إضافة كادر جديد</button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employees.map(emp => (
                            <div key={emp.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                                <h4 className="font-black text-slate-800 text-lg">{emp.name}</h4>
                                <p className="text-[10px] text-blue-600 font-bold uppercase mb-4">{emp.role}</p>
                                
                                <div className="grid grid-cols-2 gap-2 border-t pt-4">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">الأساسي</p>
                                        <p className="font-black text-slate-700">{emp.base_salary} ج</p>
                                    </div>
                                    <div className="text-center bg-blue-50 rounded-2xl p-2 border border-blue-100">
                                        <p className="text-[9px] text-blue-600 font-bold uppercase">المستحق الآن</p>
                                        <p className="font-black text-blue-700">{calculateSalary(emp.id, emp.base_salary)} ج</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'points' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom">
                    {/* فورم إضافة النقاط */}
                    <form onSubmit={handleAddPoints} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                        <h4 className="font-black text-slate-800">تعديل نقاط الأداء</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={pointForm.emp_id} onChange={e => setPointForm({...pointForm, emp_id: e.target.value})}>
                                <option value="">اختر الموظف...</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <select className="p-4 bg-slate-50 border rounded-2xl font-bold text-xs" value={pointForm.type} onChange={e => setPointForm({...pointForm, type: e.target.value})}>
                                    <option value="plus">إضافة (+)</option>
                                    <option value="minus">خصم (-)</option>
                                </select>
                                <input type="number" placeholder="عدد النقاط" required className="flex-1 p-4 bg-slate-50 border rounded-2xl font-black" value={pointForm.amount} onChange={e => setPointForm({...pointForm, amount: e.target.value})} />
                            </div>
                        </div>
                        <input placeholder="السبب (مثلاً: إنجاز تصميم، تأخير في الرد...)" required className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={pointForm.reason} onChange={e => setPointForm({...pointForm, reason: e.target.value})} />
                        <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">اعتماد النقاط</button>
                    </form>

                    {/* سجل النقاط الأخير */}
                    <div className="space-y-2">
                        <p className="text-xs font-black text-slate-400 px-2 uppercase">آخر سجلات الأداء</p>
                        {points.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(p => (
                            <div key={p.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-sm text-slate-800">{employees.find(e => e.id === p.emp_id)?.name}</p>
                                    <p className="text-[10px] text-slate-400">{p.reason}</p>
                                </div>
                                <span className={`font-black ${p.type === 'plus' ? 'text-green-600' : 'text-red-600'}`}>
                                    {p.type === 'plus' ? '+' : '-'}{p.amount} نقطة
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي السجلات</p>
                            <p className="text-2xl font-black text-slate-800 mt-2">{attendanceStats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase">مقبول</p>
                            <p className="text-2xl font-black text-green-600 mt-2">{attendanceStats.approved}</p>
                        </div>
                        <div className="bg-white p-4 rounded-3xl border shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase">خارج النطاق</p>
                            <p className="text-2xl font-black text-amber-600 mt-2">{attendanceStats.outside}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <form onSubmit={handleAttendanceSubmit} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                            <h4 className="font-black text-slate-800">نموذج تسجيل الحضور</h4>
                            <p className="text-[11px] text-slate-500">{attendanceStatus}</p>
                            <select required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={attendanceForm.employeeId} onChange={e => setAttendanceForm({...attendanceForm, employeeId: e.target.value})}>
                                <option value="">اختر الموظف...</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                            <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-sm" value={attendanceForm.type} onChange={e => setAttendanceForm({...attendanceForm, type: e.target.value})}>
                                <option value="حضور">حضور</option>
                                <option value="انصراف">انصراف</option>
                            </select>
                            <button type="submit" disabled={isSubmittingAttendance} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black">
                                {isSubmittingAttendance ? 'جارٍ التسجيل...' : 'تسجيل الحضور/الانصراف'}
                            </button>
                        </form>

                        <div className="space-y-4">
                            <form onSubmit={handleAttendanceSettingsSave} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                                <h4 className="font-black text-slate-800">إعدادات الموقع</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">خط العرض</label>
                                        <input type="number" step="any" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={attendanceSettings.lat} onChange={e => setAttendanceSettings({...attendanceSettings, lat: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">خط الطول</label>
                                        <input type="number" step="any" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={attendanceSettings.lng} onChange={e => setAttendanceSettings({...attendanceSettings, lng: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase">نطاق السماحية (متر)</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={attendanceSettings.radius} onChange={e => setAttendanceSettings({...attendanceSettings, radius: e.target.value})} />
                                </div>
                                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black">حفظ الإعدادات</button>
                            </form>

                            {attendanceStats.latest && (
                                <div className="bg-white p-4 rounded-3xl border shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">آخر تسجيل</p>
                                    <p className="font-black text-slate-800 mt-2">{attendanceStats.latest.name}</p>
                                    <p className="text-sm text-slate-500">{attendanceStats.latest.type} • {new Date(attendanceStats.latest.timestamp).toLocaleString('ar-EG')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* مودال إضافة موظف */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
                    <form onSubmit={handleSaveEmployee} className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-slide-up shadow-2xl">
                        <h3 className="font-black text-xl border-b pb-4">إضافة موظف جديد</h3>
                        <input placeholder="اسم الموظف" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                        <input placeholder="المسمى الوظيفي" required className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">الراتب الأساسي</label>
                                <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">قيمة النقطة (ج)</label>
                                <input type="number" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold" value={empForm.point_value} onChange={e => setEmpForm({...empForm, point_value: e.target.value})} />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl mt-4">تثبيت الموظف</button>
                    </form>
                </div>
            )}
        </div>
    );
};

window.HRModule = HRModule;
