// client/src/pages/CRMPage.tsx (updated – no credit limit / credit score)
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  customersAPI,
  type CustomerRecord,
  type CustomerFormPayload,
  type GuarantorInput,
} from "@/services/api";
import {
    Users,
    UserPlus,
    Edit3,
    Lock,
    Plus,
    Trash2,
    CheckCircle,
    AlertTriangle,
    X,
} from "lucide-react";
import SearchFilterBar from "@/components/SearchFilterBar";
import SortableHeader from "@/components/SortableHeader";
import SubmitButton from "@/components/SubmitButton";

// Governorate / National ID parsing (unchanged)
const govMap: Record<string, string> = {
    "01": "القاهرة", "02": "الإسكندرية", "03": "بورسعيد", "04": "السويس",
    "11": "دمياط", "12": "الدقهلية", "13": "الشرقية", "14": "القليوبية",
    "15": "كفر الشيخ", "16": "الغربية", "17": "المنوفية", "18": "البحيرة",
    "19": "الإسماعيلية", "21": "الجيزة", "22": "بني سويف", "23": "الفيوم",
    "24": "المنيا", "25": "أسيوط", "26": "سوهاج", "27": "قنا", "28": "أسوان",
    "29": "الأقصر", "31": "البحر الأحمر", "32": "الوادي الجديد", "33": "مطروح",
    "34": "شمال سيناء", "35": "جنوب سيناء", "88": "خارج الجمهورية",
};

const parseNationalId = (id: string) => {
    if (!/^\d{14}$/.test(id)) return null;
    const century = id[0];
    const year = id.substring(1, 3);
    const month = id.substring(3, 5);
    const day = id.substring(5, 7);
    const govCode = id.substring(7, 9);
    const genderDigit = parseInt(id[12]);

    let fullYear = century === "2" ? `19${year}` : century === "3" ? `20${year}` : null;
    if (!fullYear) return null;

    const dob = `${fullYear}-${month}-${day}`;
    const ageDifMs = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    return {
        birth_date: dob,
        age,
        gender: genderDigit % 2 === 1 ? "ذكر" : "أنثى",
        governorate: govMap[govCode] || "غير معروف",
    };
};

const isValidEgyptianPhone = (phone: string) =>
    /^01[0125][0-9]{8}$/.test(phone.replace(/\D/g, ""));

const STATUS_FILTER_OPTIONS = [
    { label: "الكل", value: "all" },
    { label: "نشط", value: "active" },
    { label: "غير نشط", value: "inactive" },
    { label: "محظور", value: "blacklisted" },
];

export default function CRMPage() {
    // --- Data & UI state ---
    const [customers, setCustomers] = useState<CustomerRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [sortKey, setSortKey] = useState<keyof CustomerRecord | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);

    const [form, setForm] = useState<CustomerFormPayload>({
        full_name: "",
        phone: "",
    });
    const [guarantors, setGuarantors] = useState<GuarantorInput[]>([]);
    const [parsedInfo, setParsedInfo] = useState<ReturnType<typeof parseNationalId>>(null);
    const [adminPassword, setAdminPassword] = useState("");

    const loadCustomers = useCallback(async () => {
        setIsLoading(true);
        try {
        const { data } = await customersAPI.list();
        setCustomers(data.customers);
        } catch (err: any) {
        showNotif("error", err.message || "فشل تحميل العملاء");
        } finally {
        setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    const showNotif = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const resetForm = () => {
        setForm({ full_name: "", phone: "" });
        setGuarantors([]);
        setParsedInfo(null);
        setAdminPassword("");
        setApiError(null);
    };

    const openAdd = () => {
        setEditingCustomer(null);
        resetForm();
        setModalOpen(true);
    };

    const openEdit = async (cust: CustomerRecord) => {
        setEditingCustomer(cust);
        setApiError(null);
        try {
        const { data } = await customersAPI.getById(cust.id);
        const c = data.customer;
        setForm({
            full_name: c.full_name,
            phone: c.phone,
            national_id: c.national_id || "",
            address: c.address || "",
            monthly_income: c.monthly_income || undefined,
            branch_id: c.branch_id,
            job: (c as any).job || "",
            job_type: (c as any).job_type || "قطاع خاص",
            employer_address: (c as any).employer_address || "",
            housing_type: (c as any).housing_type || "إيجار جديد",
            marital_status: (c as any).marital_status || "متزوج",
            area: (c as any).area || "",
            city: (c as any).city || "",
            address_details: (c as any).address_details || "",
            bank_name: (c as any).bank_name || "",
            bank_account: (c as any).bank_account || "",
            iban: (c as any).iban || "",
            notes: (c as any).notes || "",
        });
        setGuarantors([]);
        setParsedInfo(c.national_id ? parseNationalId(c.national_id) : null);
        } catch (err: any) {
        showNotif("error", "فشل تحميل بيانات العميل");
        return;
        }
        setModalOpen(true);
    };

    const handleNationalIdChange = (val: string) => {
        const clean = val.replace(/\D/g, "").slice(0, 14);
        setForm((prev) => ({ ...prev, national_id: clean }));
        if (clean.length === 14) {
        const parsed = parseNationalId(clean);
        if (parsed) {
            if (parsed.age < 21 || parsed.age > 65) {
            showNotif("error", "العمر خارج النطاق المسموح (21-65)");
            return;
            }
            setParsedInfo(parsed);
        } else {
            setParsedInfo(null);
        }
        } else {
        setParsedInfo(null);
        }
    };

    const addGuarantor = () =>
        setGuarantors((prev) => [...prev, { full_name: "", phone: "", national_id: "", relation: "" }]);
    const removeGuarantor = (index: number) =>
        setGuarantors((prev) => prev.filter((_, i) => i !== index));
    const updateGuarantor = (index: number, field: keyof GuarantorInput, value: string) =>
        setGuarantors((prev) =>
        prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
        );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!form.full_name.trim()) {
        showNotif("error", "الاسم مطلوب");
        return;
        }
        if (!isValidEgyptianPhone(form.phone)) {
        showNotif("error", "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)");
        return;
        }

        for (let i = 0; i < guarantors.length; i++) {
        if (!guarantors[i].full_name.trim()) {
            showNotif("error", `اسم الضامن ${i + 1} مطلوب`);
            return;
        }
        if (!isValidEgyptianPhone(guarantors[i].phone)) {
            showNotif("error", `رقم هاتف الضامن ${i + 1} غير صحيح`);
            return;
        }
        }

        setIsSaving(true);
        const payload: CustomerFormPayload = {
        ...form,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : undefined,
        guarantors,
        };

        try {
        if (editingCustomer) {
            if (form.national_id !== editingCustomer.national_id) {
            if (adminPassword !== "FinTech‑Pro") {
                showNotif("error", "كلمة مرور الإدارة غير صحيحة");
                setIsSaving(false);
                return;
            }
            (payload as any).admin_password = adminPassword;
            }
            await customersAPI.update(editingCustomer.id, payload);
            showNotif("success", "تم تحديث بيانات العميل");
        } else {
            await customersAPI.create(payload);
            showNotif("success", "تم إضافة العميل بنجاح");
        }
        setModalOpen(false);
        loadCustomers();
        } catch (err: any) {
        setApiError(err.message || "حدث خطأ أثناء الحفظ");
        } finally {
        setIsSaving(false);
        }
    };

    // --- Sorting & Filtering logic ---
    const sortedAndFilteredCustomers = useMemo(() => {
        let filtered = [...customers];

        if (statusFilter !== "all") {
        filtered = filtered.filter((c) => c.status === statusFilter);
        }

        if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
            (c) =>
            c.full_name?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.national_id?.includes(q) ||
            (c as any).internal_code?.toLowerCase().includes(q)
        );
        }

        if (sortKey) {
        filtered.sort((a, b) => {
            let valA = a[sortKey as keyof CustomerRecord];
            let valB = b[sortKey as keyof CustomerRecord];
            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();
            if (valA == null) return 1;
            if (valB == null) return -1;
            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        }

        return filtered;
    }, [customers, search, statusFilter, sortKey, sortDir]);

    const handleSort = (key: keyof CustomerRecord) => {
        if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
        setSortKey(key);
        setSortDir("asc");
        }
    };

    // Columns without credit_limit and credit_score
    const columns: { key: keyof CustomerRecord | "actions"; label: string }[] = [
        { key: "full_name", label: "الاسم" },
        { key: "phone", label: "الهاتف" },
        { key: "national_id", label: "الرقم القومي" },
        { key: "monthly_income", label: "الدخل الشهري" },
        { key: "status", label: "الحالة" },
        { key: "actions", label: "إجراءات" }, // actions column is not sortable
    ];

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 font-sans" dir="rtl">
        {/* Notification Toast */}
        {notification && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-2.5 rounded-xl shadow-lg text-white font-bold text-sm animate-bounce">
            <div
                className={`flex items-center gap-2 ${
                notification.type === "success" ? "bg-emerald-600" : "bg-red-600"
                } px-4 py-2 rounded-xl`}
            >
                {notification.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
                ) : (
                <AlertTriangle className="w-4 h-4" />
                )}
                {notification.message}
            </div>
            </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-7 h-7 text-blue-600" />
                إدارة العملاء
            </h1>
            <p className="text-sm text-slate-500 mt-1">
                {customers.length} عميل مسجل
            </p>
            </div>
            <button
            onClick={openAdd}
            className="w-full sm:w-auto bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md flex items-center justify-center gap-2"
            >
            <UserPlus className="w-5 h-5" />
            إضافة عميل جديد
            </button>
        </div>

        {/* Search & Filter */}
        <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="ابحث باسم العميل، الهاتف، الرقم القومي..."
            filterValue={statusFilter}
            filterOptions={STATUS_FILTER_OPTIONS}
            onFilterChange={setStatusFilter}
            filterLabel="كل الحالات"
        />

        {/* Customers Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-700 text-sm font-semibold">
                <tr>
                    {columns.map((col) =>
                    col.key === "actions" ? (
                        <th key="actions" className="p-3 text-center">
                        {col.label}
                        </th>
                    ) : (
                        <SortableHeader
                        key={col.key}
                        label={col.label}
                        active={sortKey === col.key}
                        direction={sortDir}
                        onClick={() => handleSort(col.key as keyof CustomerRecord)}
                        />
                    )
                    )}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {isLoading ? (
                    <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                        جاري تحميل البيانات...
                    </td>
                    </tr>
                ) : sortedAndFilteredCustomers.length === 0 ? (
                    <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                        لا يوجد عملاء مطابقين
                    </td>
                    </tr>
                ) : (
                    sortedAndFilteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {customer.full_name?.charAt(0)}
                        </div>
                        <span className="font-medium">{customer.full_name || "—"}</span>
                        </td>
                        <td className="p-3" dir="ltr">
                        {customer.phone || "—"}
                        </td>
                        <td className="p-3" dir="ltr">
                        {customer.national_id || "—"}
                        </td>
                        <td className="p-3 text-emerald-600 font-medium">
                        {customer.monthly_income
                            ? `${Number(customer.monthly_income).toLocaleString()} ج.م`
                            : "—"}
                        </td>
                        <td className="p-3">
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.status === "active"
                                ? "bg-green-50 text-green-700"
                                : customer.status === "blacklisted"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {customer.status === "active"
                            ? "نشط"
                            : customer.status === "blacklisted"
                            ? "محظور"
                            : "غير نشط"}
                        </span>
                        </td>
                        <td className="p-3 text-center">
                        <button
                            onClick={() => openEdit(customer)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
                            title="تعديل"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        </div>

        {/* ---------- CENTERED MODAL (unchanged) ---------- */}
        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b bg-slate-50 shrink-0">
                <button
                    onClick={() => setModalOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-200 text-slate-500"
                >
                    <X className="w-5 h-5" />
                </button>
                <h2 className="font-bold text-lg">
                    {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
                </h2>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <form id="crm-form" onSubmit={handleSubmit}>
                        {/* Basic Identity */}
                        <fieldset className="border rounded-2xl p-4">
                        <legend className="text-sm font-bold text-slate-600 px-2">
                            1. الهوية الأساسية
                        </legend>
                        <div className="space-y-3 mt-2">
                            <input
                            required
                            placeholder="الاسم الرباعي *"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.full_name}
                            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                            />
                            <div className="flex gap-2">
                            <input
                                maxLength={14}
                                placeholder="الرقم القومي (اختياري)"
                                className="flex-1 p-3 bg-slate-50 border rounded-xl text-sm"
                                value={form.national_id}
                                onChange={(e) => handleNationalIdChange(e.target.value)}
                                disabled={!!editingCustomer} // locked by default; unlock via password
                            />
                            {editingCustomer && (
                                <button
                                type="button"
                                onClick={() => setAdminPassword("")}
                                className="p-3 bg-slate-100 rounded-xl"
                                title="فتح تعديل الرقم القومي"
                                >
                                <Lock className="w-4 h-4" />
                                </button>
                            )}
                            </div>
                            {editingCustomer && (
                            <input
                                type="password"
                                placeholder="كلمة مرور الإدارة لتعديل الرقم القومي"
                                className="w-full p-3 bg-red-50 border rounded-xl text-sm"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                            />
                            )}
                            {parsedInfo && (
                            <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 rounded-xl text-xs">
                                <div className="text-center">
                                <span className="text-blue-500 block">العمر</span>
                                <span className="font-black">{parsedInfo.age}</span>
                                </div>
                                <div className="text-center">
                                <span className="text-blue-500 block">المحافظة</span>
                                <span className="font-black">{parsedInfo.governorate}</span>
                                </div>
                                <div className="text-center">
                                <span className="text-blue-500 block">النوع</span>
                                <span className="font-black">{parsedInfo.gender}</span>
                                </div>
                            </div>
                            )}
                            <input
                            required
                            placeholder="رقم الهاتف *"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.phone}
                            onChange={(e) =>
                                setForm((p) => ({
                                ...p,
                                phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                                }))
                            }
                            />
                            <input
                            type="email"
                            placeholder="البريد الإلكتروني (اختياري)"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={(form as any).email || ""}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, email: e.target.value }))
                            }
                            />
                        </div>
                        </fieldset>

                        {/* Address */}
                        <fieldset className="border rounded-2xl p-4">
                        <legend className="text-sm font-bold text-slate-600 px-2">
                            2. العنوان
                        </legend>
                        <div className="space-y-3 mt-2">
                            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl">
                            {["تمليك", "إيجار جديد", "إيجار قديم"].map((t) => (
                                <button
                                key={t}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, housing_type: t }))}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                                    form.housing_type === t
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-600"
                                }`}
                                >
                                {t}
                                </button>
                            ))}
                            </div>
                            <input
                            placeholder="المحافظة"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={parsedInfo?.governorate || ""}
                            disabled
                            />
                            <input
                            placeholder="المنطقة / المركز"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.area}
                            onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                            />
                            <input
                            placeholder="المدينة"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.city || ""}
                            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                            />
                            <input
                            placeholder="العنوان بالتفصيل"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.address_details}
                            onChange={(e) => setForm((p) => ({ ...p, address_details: e.target.value }))}
                            />
                        </div>
                        </fieldset>

                        {/* Work & Income */}
                        <fieldset className="border rounded-2xl p-4">
                        <legend className="text-sm font-bold text-slate-600 px-2">
                            3. العمل والدخل
                        </legend>
                        <div className="space-y-3 mt-2">
                            <input
                            placeholder="جهة العمل"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.job}
                            onChange={(e) => setForm((p) => ({ ...p, job: e.target.value }))}
                            />
                            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl">
                            {["قطاع خاص", "حكومي", "أعمال حرة", "معاش"].map((t) => (
                                <button
                                key={t}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, job_type: t }))}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                                    form.job_type === t
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-600"
                                }`}
                                >
                                {t}
                                </button>
                            ))}
                            </div>
                            <input
                            type="number"
                            placeholder="الدخل الشهري (اختياري)"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.monthly_income || ""}
                            onChange={(e) =>
                                setForm((p) => ({
                                ...p,
                                monthly_income: e.target.value ? Number(e.target.value) : undefined,
                                }))
                            }
                            />
                            <input
                            placeholder="عنوان جهة العمل"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.employer_address || ""}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, employer_address: e.target.value }))
                            }
                            />
                        </div>
                        </fieldset>

                        {/* Guarantors */}
                        <fieldset className="border rounded-2xl p-4">
                        <legend className="text-sm font-bold text-slate-600 px-2">
                            4. الضامنين ({guarantors.length})
                        </legend>
                        <div className="mt-2 space-y-3">
                            {guarantors.map((g, idx) => (
                            <div
                                key={idx}
                                className="relative bg-slate-50 p-3 rounded-xl border"
                            >
                                <button
                                type="button"
                                onClick={() => removeGuarantor(idx)}
                                className="absolute top-2 left-2 p-1 bg-red-50 text-red-500 rounded-lg"
                                >
                                <Trash2 className="w-3 h-3" />
                                </button>
                                <div className="grid grid-cols-1 gap-2">
                                <input
                                    placeholder="الاسم"
                                    className="p-2 bg-white border rounded-lg text-xs"
                                    value={g.full_name}
                                    onChange={(e) =>
                                    updateGuarantor(idx, "full_name", e.target.value)
                                    }
                                />
                                <input
                                    placeholder="الهاتف"
                                    className="p-2 bg-white border rounded-lg text-xs"
                                    value={g.phone}
                                    onChange={(e) =>
                                    updateGuarantor(idx, "phone", e.target.value.replace(/\D/g, ""))
                                    }
                                />
                                <input
                                    placeholder="الرقم القومي (اختياري)"
                                    className="p-2 bg-white border rounded-lg text-xs"
                                    value={g.national_id || ""}
                                    onChange={(e) =>
                                    updateGuarantor(idx, "national_id", e.target.value)
                                    }
                                />
                                <input
                                    placeholder="القرابة"
                                    className="p-2 bg-white border rounded-lg text-xs"
                                    value={g.relation || ""}
                                    onChange={(e) =>
                                    updateGuarantor(idx, "relation", e.target.value)
                                    }
                                />
                                </div>
                            </div>
                            ))}
                            <button
                            type="button"
                            onClick={addGuarantor}
                            className="flex items-center gap-1 text-blue-600 text-xs font-bold"
                            >
                            <Plus className="w-4 h-4" /> إضافة ضامن
                            </button>
                        </div>
                        </fieldset>

                        {/* Bank & Notes */}
                        <fieldset className="border rounded-2xl p-4">
                        <legend className="text-sm font-bold text-slate-600 px-2">
                            5. بيانات إضافية
                        </legend>
                        <div className="space-y-3 mt-2">
                            <input
                            placeholder="اسم البنك"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.bank_name || ""}
                            onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                            />
                            <input
                            placeholder="رقم الحساب"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.bank_account || ""}
                            onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))}
                            />
                            <input
                            placeholder="IBAN"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.iban || ""}
                            onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))}
                            />
                            <textarea
                            rows={2}
                            placeholder="ملاحظات"
                            className="w-full p-3 bg-slate-50 border rounded-xl text-sm"
                            value={form.notes || ""}
                            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            />
                        </div>
                        </fieldset>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="shrink-0 border-t p-4 bg-white flex gap-3">
                <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 rounded-xl border font-bold text-sm hover:bg-slate-50"
                >
                    إلغاء
                </button>
                <SubmitButton
                    form="crm-form"
                    label={editingCustomer ? "تحديث" : "حفظ العميل"}
                    loading={isSaving}
                    loadingLabel="جارٍ الحفظ..."
                    variant="primary"
                    className="flex-1"
                />
                </div>
                {apiError && (
                <div className="px-4 pb-2 text-red-500 text-xs font-bold text-center">
                    {apiError}
                </div>
                )}
            </div>
            </div>
        )}
        </div>
    );
}