import { useState, useEffect, useMemo } from "react"
import { Search, Plus, Scale, User, X } from "lucide-react"

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
interface LegalCase {
    id: string
    case_number: string
    case_type: string
    sub_type: string
    status: "open" | "in_court" | "judged" | "closed" | "appealed"
    court: string
    circuit: string
    filing_date: string
    claim_amount: string
    opponent_name: string
    opponent_lawyer: string
    client_role: string
    lawyer_name: string
    notes: string
    invoice_id: string
    customer_id: string
    guarantor_ids: string[]
    next_session: string
    created_at: string
    updated_at: string
    synced: boolean
}

interface HearingForm {
    hearing_date: string
    hearing_number: string
    result: string
    next_hearing_date: string
    notes: string
}

interface DocForm {
    doc_name: string
    doc_type: string
    file: File | null
}

const emptyCaseForm: LegalCase = {
    id: "",
    case_number: "",
    case_type: "مدني",
    sub_type: "مدني كلي",
    status: "open",
    court: "",
    circuit: "",
    filing_date: new Date().toISOString().split("T")[0],
    claim_amount: "",
    opponent_name: "",
    opponent_lawyer: "",
    client_role: "مدعي",
    lawyer_name: "",
    notes: "",
    invoice_id: "",
    customer_id: "",
    guarantor_ids: [],
    next_session: "",
    created_at: "",
    updated_at: "",
    synced: false,
}

const emptyHearingForm: HearingForm = {
    hearing_date: "",
    hearing_number: "",
    result: "",
    next_hearing_date: "",
    notes: "",
}

const emptyDocForm: DocForm = {
    doc_name: "",
    doc_type: "",
    file: null,
}

const caseStatusLabels: Record<string, string> = {
    open: "مفتوحة",
    in_court: "منظورة",
    judged: "محكوم فيها",
    closed: "منتهية",
    appealed: "مطعون فيها",
}

const caseStatusColors: Record<string, string> = {
    open: "bg-orange-50 text-orange-700 border-orange-200",
    in_court: "bg-blue-50 text-blue-700 border-blue-200",
    judged: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-gray-100 text-gray-700 border-gray-200",
    appealed: "bg-purple-50 text-purple-700 border-purple-200",
}

export default function LegalPage() {
    // Data
    const [cases, setCases] = useState<LegalCase[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [invoices, setInvoices] = useState<any[]>([])
    const [hearings, setHearings] = useState<any[]>([])
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // UI
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add")
    const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null)
    const [activeTab, setActiveTab] = useState<"details" | "hearings" | "documents">("details")

    // Forms
    const [caseForm, setCaseForm] = useState<LegalCase>(emptyCaseForm)
    const [hearingForm, setHearingForm] = useState<HearingForm>(emptyHearingForm)
    const [docForm, setDocForm] = useState<DocForm>(emptyDocForm)

    // ------------------------------------------------------------
    // Data Loading
    // ------------------------------------------------------------
    const loadData = async () => {
        setLoading(true)
        try {
        setCustomers([])
        setInvoices([])
        setCases([])
        setHearings([])
        setDocuments([])
        } catch (err) {
        console.error("Failed to load legal data:", err)
        } finally {
        setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    const getCustomerName = (id: string) => {
        const c = customers.find((c) => c.id === id)
        return c ? c.full_name || c.name : "—"
    }

    const getInvoiceLabel = (id: string) => {
        const inv = invoices.find((i) => i.id === id)
        return inv ? `عقد #${inv.id.slice(0, 8)}` : "—"
    }

    // ------------------------------------------------------------
    // Case Save
    // ------------------------------------------------------------
    const handleSaveCase = async (e: React.FormEvent) => {
        e.preventDefault()
        alert("تم إزالة خاصية النظام القانوني غير المتصلة. لا يمكن حفظ القضية حالياً.")
        setIsModalOpen(false)
        setCaseForm(emptyCaseForm)
    }

    // ------------------------------------------------------------
    // Hearings & Documents (placeholder actions)
    // ------------------------------------------------------------
    const handleAddHearing = async (caseId: string) => {
        if (!hearingForm.hearing_date) return alert("⚠️ تاريخ الجلسة مطلوب")
        alert("تم إزالة خاصية إضافة الجلسة غير المتصلة. لا يمكن حفظ الجلسة حالياً.")
        setHearingForm(emptyHearingForm)
    }

    const handleAddDocument = async (caseId: string) => {
        if (!docForm.doc_name || !docForm.file) return alert("⚠️ اسم المستند والملف مطلوبان")
        alert("تم إزالة خاصية إضافة المستندات غير المتصلة. لا يمكن حفظ المستند حالياً.")
        setDocForm(emptyDocForm)
    }

    // ------------------------------------------------------------
    // Filter & Search
    // ------------------------------------------------------------
    const filteredCases = useMemo(() => {
        return cases.filter((c) => {
        const matchSearch =
            c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            getCustomerName(c.customer_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.opponent_name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchStatus = statusFilter === "all" || c.status === statusFilter
        return matchSearch && matchStatus
        })
    }, [cases, searchQuery, statusFilter, customers])

    // ------------------------------------------------------------
    // Modal Openers
    // ------------------------------------------------------------
    const openAddModal = () => {
        setCaseForm(emptyCaseForm)
        setModalMode("add")
        setIsModalOpen(true)
        setActiveTab("details")
    }

    const openEditModal = (c: LegalCase) => {
        setCaseForm({ ...c })
        setModalMode("edit")
        setIsModalOpen(true)
        setActiveTab("details")
    }

    const openViewModal = (c: LegalCase) => {
        setSelectedCase(c)
        setModalMode("view")
        setIsModalOpen(true)
        setActiveTab("details")
    }

    // ------------------------------------------------------------
    // JSX
    // ------------------------------------------------------------
    return (
        <div className="font-sans animate-in fade-in" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Scale className="text-red-600" />
                الشؤون القانونية
            </h1>
            <p className="text-gray-500 text-sm mt-1">إدارة القضايا، الجلسات، المستندات، والأحكام المرتبطة بالعملاء والعقود</p>
            </div>
            <button
            onClick={openAddModal}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 transition-all flex items-center gap-2"
            >
            <Plus className="w-5 h-5" />
            قضية جديدة
            </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
                type="text"
                placeholder="بحث برقم القضية، اسم العميل، الخصم..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-red-500 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            </div>
            <select
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-red-500 transition-all text-gray-700"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            >
            <option value="all">كل الحالات</option>
            <option value="open">مفتوحة</option>
            <option value="in_court">منظورة</option>
            <option value="judged">محكوم فيها</option>
            <option value="closed">منتهية</option>
            <option value="appealed">مطعون فيها</option>
            </select>
        </div>

        {/* Cases Grid */}
        {loading ? (
            <div className="text-center py-12 text-gray-400 animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm">جاري تحميل البيانات...</div>
        ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
            لا توجد قضايا مسجلة
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
                <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
                onClick={() => openViewModal(c)}
                >
                <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {getCustomerName(c.customer_id)}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mt-1">رقم القضية: {c.case_number}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${caseStatusColors[c.status]}`}>
                        {caseStatusLabels[c.status]}
                    </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mt-4 border-t border-gray-50 pt-4">
                    <div>
                        <span className="text-gray-400 text-xs block mb-0.5">الخصم:</span>
                        <p className="font-medium text-gray-800 truncate" title={c.opponent_name}>{c.opponent_name || "—"}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-xs block mb-0.5">المحكمة:</span>
                        <p className="font-medium text-gray-800 truncate" title={c.court}>{c.court || "—"}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-xs block mb-0.5">المحامي:</span>
                        <p className="font-medium text-gray-800 truncate" title={c.lawyer_name}>{c.lawyer_name || "—"}</p>
                    </div>
                    <div>
                        <span className="text-gray-400 text-xs block mb-0.5">الجلسة القادمة:</span>
                        <p className="font-bold text-red-600 truncate">{c.next_session || "لا توجد"}</p>
                    </div>
                    </div>

                    {c.invoice_id && (
                    <div className="mt-4 px-3 py-2 bg-blue-50/50 rounded-lg text-xs font-semibold text-blue-700 border border-blue-100/50">
                        📄 {getInvoiceLabel(c.invoice_id)}
                    </div>
                    )}
                </div>
                </div>
            ))}
            </div>
        )}

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-100">
                {/* Modal Header */}
                <div className="bg-gray-50 border-b border-gray-100 p-5 flex justify-between items-center shrink-0">
                <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Scale className="text-red-600 w-5 h-5" />
                    {modalMode === "add" ? "إضافة قضية جديدة" : modalMode === "edit" ? "تعديل القضية" : "تفاصيل القضية"}
                    </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                </button>
                </div>

                {/* Tabs for view mode */}
                {modalMode === "view" && selectedCase && (
                <div className="flex border-b border-gray-100 bg-white px-6 pt-4 gap-4 shrink-0 overflow-x-auto">
                    {["details", "hearings", "documents"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 border-b-2 font-medium text-sm transition-all whitespace-nowrap ${
                            activeTab === tab 
                            ? "border-red-600 text-red-600" 
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                        }`}
                    >
                        {tab === "details" && "📋 بيانات القضية"}
                        {tab === "hearings" && "⚖️ الجلسات"}
                        {tab === "documents" && "📁 المستندات المرفقة"}
                    </button>
                    ))}
                </div>
                )}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scroll bg-white">
                {modalMode !== "view" ? (
                    /* Add/Edit Form */
                    <form onSubmit={handleSaveCase} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* customer_id */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">العميل <span className="text-red-500">*</span></label>
                        <select required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.customer_id} onChange={(e) => setCaseForm({ ...caseForm, customer_id: e.target.value })}>
                            <option value="">اختر العميل</option>
                            {customers.map((c) => (<option key={c.id} value={c.id}>{c.full_name || c.name}</option>))}
                        </select>
                        </div>
                        {/* invoice_id */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">العقد المرتبط</label>
                        <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.invoice_id} onChange={(e) => setCaseForm({ ...caseForm, invoice_id: e.target.value })}>
                            <option value="">بدون عقد</option>
                            {invoices.map((inv) => (<option key={inv.id} value={inv.id}>عقد #{inv.id.slice(0, 8)} - {getCustomerName(inv.client_id)}</option>))}
                        </select>
                        </div>
                        {/* case_number */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم القضية <span className="text-red-500">*</span></label>
                        <input required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.case_number} onChange={(e) => setCaseForm({ ...caseForm, case_number: e.target.value })} />
                        </div>
                        {/* case_type */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">نوع القضية</label>
                        <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.case_type} onChange={(e) => setCaseForm({ ...caseForm, case_type: e.target.value })}>
                            <option value="مدني">مدني</option>
                            <option value="جنائي">جنائي</option>
                            <option value="أسرة">أسرة</option>
                            <option value="إداري">إداري</option>
                            <option value="تجاري">تجاري</option>
                            <option value="عمالي">عمالي</option>
                            <option value="جنحة تبديد">جنحة تبديد</option>
                            <option value="شيك بدون رصيد">شيك بدون رصيد</option>
                        </select>
                        </div>
                        {/* sub_type */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">النوع الفرعي</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.sub_type} onChange={(e) => setCaseForm({ ...caseForm, sub_type: e.target.value })} />
                        </div>
                        {/* status */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">الحالة</label>
                        <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.status} onChange={(e) => setCaseForm({ ...caseForm, status: e.target.value as any })}>
                            {Object.entries(caseStatusLabels).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
                        </select>
                        </div>
                        {/* court / circuit */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">المحكمة</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.court} onChange={(e) => setCaseForm({ ...caseForm, court: e.target.value })} />
                        </div>
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">الدائرة</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.circuit} onChange={(e) => setCaseForm({ ...caseForm, circuit: e.target.value })} />
                        </div>
                        {/* filing_date / claim_amount */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">تاريخ رفع الدعوى</label>
                        <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.filing_date} onChange={(e) => setCaseForm({ ...caseForm, filing_date: e.target.value })} />
                        </div>
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">قيمة الدعوى (إن وجدت)</label>
                        <input type="number" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.claim_amount} onChange={(e) => setCaseForm({ ...caseForm, claim_amount: e.target.value })} />
                        </div>
                        {/* opponent_name / opponent_lawyer */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم الخصم</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.opponent_name} onChange={(e) => setCaseForm({ ...caseForm, opponent_name: e.target.value })} />
                        </div>
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">محامي الخصم</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.opponent_lawyer} onChange={(e) => setCaseForm({ ...caseForm, opponent_lawyer: e.target.value })} />
                        </div>
                        {/* client_role / lawyer_name */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">صفة العميل</label>
                        <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.client_role} onChange={(e) => setCaseForm({ ...caseForm, client_role: e.target.value })}>
                            <option value="مدعي">مدعي</option>
                            <option value="مدعى عليه">مدعى عليه</option>
                            <option value="متهم">متهم</option>
                        </select>
                        </div>
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">المحامي المسؤول</label>
                        <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.lawyer_name} onChange={(e) => setCaseForm({ ...caseForm, lawyer_name: e.target.value })} />
                        </div>
                        {/* next_session */}
                        <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">الجلسة القادمة</label>
                        <input type="date" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.next_session} onChange={(e) => setCaseForm({ ...caseForm, next_session: e.target.value })} />
                        </div>
                        {/* guarantor_ids */}
                        <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">الضامنون المرتبطون</label>
                        <select multiple className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all h-32" value={caseForm.guarantor_ids} onChange={(e) => setCaseForm({ ...caseForm, guarantor_ids: Array.from(e.target.selectedOptions, opt => opt.value) })}>
                            {customers.filter(c => c.id !== caseForm.customer_id).map(c => (<option key={c.id} value={c.id}>{c.full_name || c.name}</option>))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1.5">اضغط Ctrl (أو Cmd) لاختيار عدة ضامنين</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">ملاحظات</label>
                        <textarea rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-500 transition-all" value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">إلغاء</button>
                        <button type="submit" className="px-8 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
                        {modalMode === "add" ? "إضافة القضية" : "تحديث القضية"}
                        </button>
                    </div>
                    </form>
                ) : (
                    /* View Mode with Tabs */
                    selectedCase && (
                    <div>
                        {activeTab === "details" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-gray-50 border border-gray-100 p-6 rounded-xl text-sm">
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">العميل</span><p className="font-bold text-gray-800">{getCustomerName(selectedCase.customer_id)}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">رقم القضية</span><p className="font-bold text-gray-800">{selectedCase.case_number}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">النوع</span><p className="font-bold text-gray-800">{selectedCase.case_type} - {selectedCase.sub_type}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">الحالة</span><p className={`font-bold inline-block px-2.5 py-0.5 rounded-md text-xs border ${caseStatusColors[selectedCase.status]}`}>{caseStatusLabels[selectedCase.status]}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">المحكمة</span><p className="font-bold text-gray-800">{selectedCase.court || "—"}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">الدائرة</span><p className="font-bold text-gray-800">{selectedCase.circuit || "—"}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">تاريخ الرفع</span><p className="font-bold text-gray-800">{selectedCase.filing_date}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">الخصم</span><p className="font-bold text-gray-800">{selectedCase.opponent_name || "—"}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">محامي الخصم</span><p className="font-bold text-gray-800">{selectedCase.opponent_lawyer || "—"}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">صفة العميل</span><p className="font-bold text-gray-800">{selectedCase.client_role}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">المحامي المسؤول</span><p className="font-bold text-gray-800">{selectedCase.lawyer_name || "—"}</p></div>
                                <div><span className="block text-xs font-semibold text-gray-500 mb-1">الجلسة القادمة</span><p className="font-bold text-red-600">{selectedCase.next_session || "لا توجد"}</p></div>
                            </div>
                            
                            {selectedCase.invoice_id && (
                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl text-blue-800 font-medium text-sm flex items-center gap-2">
                                <span className="text-xl">📄</span> العقد المرتبط: {getInvoiceLabel(selectedCase.invoice_id)}
                            </div>
                            )}
                            
                            {selectedCase.guarantor_ids?.length > 0 && (
                            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                                <span className="font-semibold text-sm text-amber-800">الضامنون المرتبطون:</span>
                                <div className="flex flex-wrap gap-2 mt-3">
                                {selectedCase.guarantor_ids.map(gid => (<span key={gid} className="bg-white border border-amber-200 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-900">{getCustomerName(gid)}</span>))}
                                </div>
                            </div>
                            )}
                            
                            {selectedCase.notes && (
                            <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl text-sm text-gray-700 italic">
                                "{selectedCase.notes}"
                            </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button onClick={() => openEditModal(selectedCase)} className="bg-gray-800 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                                    تعديل بيانات القضية
                                </button>
                            </div>
                        </div>
                        )}

                        {activeTab === "hearings" && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl space-y-4">
                                <h5 className="font-bold text-gray-800 text-sm flex items-center gap-2">إضافة جلسة جديدة</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500" value={hearingForm.hearing_date} onChange={(e) => setHearingForm({ ...hearingForm, hearing_date: e.target.value })} />
                                    <input type="text" placeholder="رقم الجلسة" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500" value={hearingForm.hearing_number} onChange={(e) => setHearingForm({ ...hearingForm, hearing_number: e.target.value })} />
                                    <input type="text" placeholder="النتيجة أو القرار" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 col-span-2" value={hearingForm.result} onChange={(e) => setHearingForm({ ...hearingForm, result: e.target.value })} />
                                    <input type="date" placeholder="تاريخ الجلسة القادمة" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 col-span-2" value={hearingForm.next_hearing_date} onChange={(e) => setHearingForm({ ...hearingForm, next_hearing_date: e.target.value })} />
                                    <textarea rows={2} placeholder="ملاحظات الجلسة" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 col-span-2" value={hearingForm.notes} onChange={(e) => setHearingForm({ ...hearingForm, notes: e.target.value })} />
                                </div>
                                <button onClick={() => handleAddHearing(selectedCase.id)} className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors">إضافة الجلسة</button>
                            </div>
                            
                            <div className="space-y-3">
                                {hearings.filter((h: any) => h.case_id === selectedCase.id).length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">لا توجد جلسات مسجلة لهذه القضية.</p>
                                )}
                                {hearings.filter((h: any) => h.case_id === selectedCase.id).map((h: any) => (
                                    <div key={h.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center text-sm shadow-sm">
                                        <div>
                                            <p className="font-bold text-gray-800">{h.hearing_date} <span className="text-gray-400 mx-1">|</span> {h.hearing_number}</p>
                                            <p className="text-sm text-gray-600 mt-1">{h.result}</p>
                                            {h.notes && <p className="text-xs text-gray-400 mt-1 italic">{h.notes}</p>}
                                        </div>
                                        {h.next_hearing_date && (
                                            <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-100 text-center whitespace-nowrap">
                                                الجلسة القادمة<br/>{h.next_hearing_date}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}

                        {activeTab === "documents" && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 border border-gray-100 p-5 rounded-xl space-y-4">
                                <h5 className="font-bold text-gray-800 text-sm">رفع مستند جديد</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="اسم المستند" className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500" value={docForm.doc_name} onChange={(e) => setDocForm({ ...docForm, doc_name: e.target.value })} />
                                    <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500" value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}>
                                        <option value="">نوع المستند</option>
                                        <option value="عقد">عقد</option>
                                        <option value="محضر">محضر</option>
                                        <option value="حكم">حكم</option>
                                        <option value="مذكرة">مذكرة</option>
                                        <option value="أخرى">أخرى</option>
                                    </select>
                                    <input type="file" className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm md:col-span-2 text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} />
                                </div>
                                <button onClick={() => handleAddDocument(selectedCase.id)} className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors">رفع وحفظ المستند</button>
                            </div>

                            <div className="space-y-3">
                                {documents.filter((d: any) => d.case_id === selectedCase.id).length === 0 && (
                                    <p className="text-sm text-gray-400 text-center py-4">لا توجد مستندات مرفقة لهذه القضية.</p>
                                )}
                                {documents.filter((d: any) => d.case_id === selectedCase.id).map((d: any) => (
                                    <div key={d.id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center text-sm shadow-sm">
                                        <div>
                                            <p className="font-bold text-gray-800">{d.doc_name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{d.doc_type} - {new Date(d.upload_date).toLocaleDateString("ar-EG")}</p>
                                        </div>
                                        <a href={d.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium text-xs transition-colors">
                                            عرض الملف
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                    )
                )}
                </div>
            </div>
            </div>
        )}
        </div>
    )
}