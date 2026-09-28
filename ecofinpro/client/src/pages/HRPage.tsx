import { useState, useEffect } from "react"
import { Briefcase, Users, Plus, X, Award, TrendingUp, TrendingDown } from "lucide-react"

export default function HRPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [points, setPoints] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'list' | 'points'>('list')
    const [showAddEmp, setShowAddEmp] = useState(false)

    // Employee form
    const [empForm, setEmpForm] = useState({ name: '', role: '', base_salary: '', point_value: '10' })
    // Points form
    const [pointForm, setPointForm] = useState({ emp_id: '', type: 'plus', amount: '', reason: '' })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setEmployees([])
        setPoints([])
    }

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        alert("تم إزالة خاصية إدارة الموارد البشرية غير المتصلة. لا يمكن حفظ الموظف حالياً.")
    }

    const handleAddPoints = async (e: React.FormEvent) => {
        e.preventDefault()
        alert("تم إزالة خاصية النقاط غير المتصلة. لا يمكن حفظ النقاط حالياً.")
    }

    const calculateSalary = (empId: string, base: number) => {
        const empPoints = points.filter(p => p.emp_id === empId)
        const adj = empPoints.reduce((sum, p) => sum + p.cash_impact, 0)
        return base + adj
    }

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Briefcase className="text-blue-600" />
                        الموارد البشرية (HR)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">إدارة فريق العمل، الرواتب، ونظام النقاط والمكافآت</p>
                </div>
                {activeTab === 'list' && (
                    <button 
                        onClick={() => setShowAddEmp(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة كادر جديد
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-fit mb-8 border border-gray-200">
                <button 
                    onClick={() => setActiveTab('list')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Users size={18} />
                    فريق العمل
                </button>
                <button 
                    onClick={() => setActiveTab('points')} 
                    className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'points' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Award size={18} />
                    نظام النقاط
                </button>
            </div>

            {/* Employees List View */}
            {activeTab === 'list' && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <h4 className="font-bold text-lg text-gray-800">{emp.full_name || emp.name}</h4>
                            <p className="text-sm text-blue-600 font-medium mb-4">{emp.role}</p>
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">الأساسي</p>
                                    <p className="font-semibold text-gray-800">{emp.base_salary} ج.م</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <p className="text-xs text-blue-600 mb-1">المستحق الآن</p>
                                    <p className="font-bold text-blue-700">{calculateSalary(emp.id, Number(emp.base_salary))} ج.م</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-xl border border-gray-100 border-dashed text-gray-500">
                            لا يوجد موظفين مسجلين حتى الآن
                        </div>
                    )}
                </div>
            )}

            {/* Points System View */}
            {activeTab === 'points' && (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Add Points Form */}
                    <div className="lg:col-span-1">
                        <form onSubmit={handleAddPoints} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-5">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-blue-600" />
                                تعديل نقاط الأداء
                            </h4>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">اختر الموظف</label>
                                <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={pointForm.emp_id} onChange={e => setPointForm({...pointForm, emp_id: e.target.value})}>
                                    <option value="">-- يرجى الاختيار --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.full_name || e.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الإجراء وعدد النقاط</label>
                                <div className="flex gap-2">
                                    <select className="w-1/3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={pointForm.type} onChange={e => setPointForm({...pointForm, type: e.target.value})}>
                                        <option value="plus">+ إضافة</option>
                                        <option value="minus">- خصم</option>
                                    </select>
                                    <input type="number" min="1" placeholder="مثال: 5" required className="w-2/3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={pointForm.amount} onChange={e => setPointForm({...pointForm, amount: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">السبب</label>
                                <input placeholder="سبب الإضافة أو الخصم..." required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={pointForm.reason} onChange={e => setPointForm({...pointForm, reason: e.target.value})} />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition-colors mt-2">
                                اعتماد النقاط
                            </button>
                        </form>
                    </div>

                    {/* Points History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <h4 className="font-bold text-gray-800 text-sm">أحدث سجلات الأداء</h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {points.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(p => (
                                    <div key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-gray-800">{employees.find(e=>e.id===p.emp_id)?.full_name || '—'}</p>
                                            <p className="text-xs text-gray-500 mt-1">{p.reason}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${p.type==='plus'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                                            {p.type === 'plus' ? <TrendingUp className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
                                            {p.amount} نقطة
                                        </span>
                                    </div>
                                ))}
                                {points.length === 0 && (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        لا يوجد أي سجلات لنقاط الأداء حتى الآن
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {showAddEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleAddEmployee} className="bg-white w-full max-w-md rounded-2xl p-6 shadow-lg border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-5">
                            <h3 className="font-bold text-lg text-gray-800">إضافة كادر جديد</h3>
                            <button type="button" onClick={() => setShowAddEmp(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">الاسم الكامل</label>
                                <input placeholder="أدخل اسم الموظف" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">المسمى الوظيفي</label>
                                <input placeholder="مثال: مبيعات، مشرف..." required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">الراتب الأساسي (ج.م)</label>
                                    <input type="number" min="0" placeholder="0" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">قيمة النقطة (ج.م)</label>
                                    <input type="number" min="1" placeholder="10" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all" value={empForm.point_value} onChange={e => setEmpForm({...empForm, point_value: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setShowAddEmp(false)} className="px-4 py-2 rounded-md font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                                إلغاء
                            </button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
                                تثبيت الموظف
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}