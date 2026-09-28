import { useState, useEffect, useMemo } from "react";
import { UserCog, Plus, Key, X, Power, Pencil } from "lucide-react";
import { usersAPI, type EmployeeRecord } from "@/services/api";
import type { User } from "@/types/auth";
import SearchFilterBar from "@/components/SearchFilterBar";
import SortableHeader from "@/components/SortableHeader";

const ROLES: Record<string, { label: string; color: string }> = {
    MODERATOR: { label: "مدير النظام", color: "bg-blue-100 text-blue-800 border-blue-200" },
    CASHIER: { label: "كاشير", color: "bg-teal-100 text-teal-800 border-teal-200" },
    COLLECTOR: { label: "محصل", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    ACCOUNTANT: { label: "محاسب", color: "bg-amber-100 text-amber-800 border-amber-200" },
    HR_MANAGER: { label: "مدير موارد بشرية", color: "bg-purple-100 text-purple-800 border-purple-200" },
    WH_MANAGER: { label: "مدير مخازن", color: "bg-orange-100 text-orange-800 border-orange-200" },
    LAWYER: { label: "قانوني", color: "bg-red-100 text-red-800 border-red-100" },
};

// 🛡️ UPDATED: Added Shifts, Wallets, and Audit capabilities
const AVAILABLE_MODULES = [
    { id: "dashboard", name: "الرئيسية" },
    { id: "pos", name: "نقطة البيع" },
    { id: "shifts", name: "إدارة الورديات" }, 
    { id: "crm", name: "العملاء" },
    { id: "inventory", name: "المخازن" },
    { id: "purchases", name: "المشتريات" },
    { id: "suppliers", name: "الموردين" },
    { id: "collection", name: "التحصيلات" },
    { id: "wallets", name: "محافظ المحصلين" },
    { id: "reports", name: "التقارير" },
    { id: "settings", name: "الإعدادات" },
    { id: "users", name: "إدارة المستخدمين" },
    { id: "hr", name: "الموارد البشرية" },
    { id: "attendance", name: "الحضور" },
    { id: "legal", name: "القضايا" },
    { id: "partners", name: "الشركاء والأرباح" },
];

const emptyForm = {
    full_name: "",
    email: "",
    username: "",
    password: "",
    phone: "",
    role: "CASHIER",
    permissions: [] as string[],
};

interface UserManagementProps {
    currentUser: User;
}

export default function UserManagementPage({ currentUser }: UserManagementProps) {
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [autoPassword, setAutoPassword] = useState(true);
    const [formData, setFormData] = useState(emptyForm);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string; username: string; temp_password?: string } | null>(null);

    const [editModal, setEditModal] = useState<{ open: boolean; employee: EmployeeRecord | null }>({ open: false, employee: null });
    const [editRole, setEditRole] = useState("CASHIER");
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [editPhone, setEditPhone] = useState("");

    const [resetModal, setResetModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
    const [newPassword, setNewPassword] = useState("");

    // Search / sort
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
        key: "created_at",
        direction: "desc",
    });

    const loadEmployees = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await usersAPI.list();
            setEmployees(res.data.employees || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
    }, []);

    const toggleSort = (key: string) => {
        setSortConfig((prev) =>
            prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
        );
    };

    const processed = useMemo(() => {
        let list = [...employees];
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(
                (e) =>
                    (e.person?.full_name || "").toLowerCase().includes(s) ||
                    (e.username || "").toLowerCase().includes(s) ||
                    (e.phone || "").toLowerCase().includes(s)
            );
        }
        if (statusFilter !== "all") {
            const active = statusFilter === "true";
            list = list.filter((e) => e.is_active === active);
        }
        list.sort((a: any, b: any) => {
            const av = a[sortConfig.key];
            const bv = b[sortConfig.key];
            if (av == null || bv == null) return 0;
            if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
            if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [employees, search, statusFilter, sortConfig]);

    // ── Create ──────────────────────────────────────────────
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            const payload = {
                ...formData,
                password: autoPassword ? undefined : formData.password,
            };
            const res = await usersAPI.create(payload);
            setCreatedCredentials(res.data.credentials);
            setSuccess("تم إنشاء المستخدم بنجاح");
            setShowForm(false);
            setFormData(emptyForm);
            setAutoPassword(true);
            loadEmployees();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Edit ───────────────────
    const openEdit = (emp: EmployeeRecord) => {
        setEditModal({ open: true, employee: emp });
        setEditRole(emp.role);
        setEditPermissions(emp.permissions || []);
        setEditPhone(emp.phone || "");
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editModal.employee) return;
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            await usersAPI.update(editModal.employee.id, {
                role: editRole,
                permissions: editPermissions,
                phone: editPhone,
            });
            setSuccess("تم تحديث بيانات الموظف بنجاح");
            setEditModal({ open: false, employee: null });
            loadEmployees();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Activate / Deactivate ───────────────────────────────
    const handleToggleActive = async (emp: EmployeeRecord) => {
        if (!confirm(`هل أنت متأكد من ${emp.is_active ? "تعطيل" : "تفعيل"} هذا الموظف؟`)) return;
        setError("");
        try {
            await usersAPI.setActive(emp.id, !emp.is_active);
            loadEmployees();
        } catch (err: any) {
            setError(err.message);
        }
    };

    // ── Reset password ──────────────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetModal.id || !newPassword) return;
        setError("");
        setSuccess("");
        setLoading(true);
        try {
            await usersAPI.resetPassword(resetModal.id, newPassword);
            setSuccess("تم تغيير كلمة المرور بنجاح");
            setResetModal({ open: false, id: "", name: "" });
            setNewPassword("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (currentUser.role !== "OWNER") {
        return (
            <div className="p-10 text-center text-red-600 font-bold bg-red-50 rounded-2xl border border-red-100 max-w-lg mx-auto mt-10">
                ⛔ غير مصرح لك بالوصول لهذه الصفحة
            </div>
        );
    }

    return (
        <div className="font-sans space-y-6" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserCog className="text-blue-600 w-6 h-6" />
                        إدارة المستخدمين والصلاحيات
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">إنشاء حسابات الموظفين وإدارة الصلاحيات لكل قسم</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    إضافة مستخدم جديد
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium">{error}</div>}
            {success && <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">{success}</div>}

            {createdCredentials && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm space-y-2">
                    <p className="font-bold text-emerald-800">بيانات دخول الموظف الجديد — انسخها وسلّمها له الآن:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="text-xs text-gray-500 block mb-1">اسم المستخدم</span>
                            <span className="font-mono font-bold text-blue-600" dir="ltr">{createdCredentials.username}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-100">
                            <span className="text-xs text-gray-500 block mb-1">البريد الإلكتروني</span>
                            <span className="font-mono font-bold text-blue-600" dir="ltr">{createdCredentials.email}</span>
                        </div>
                        {createdCredentials.temp_password && (
                            <div className="bg-white p-3 rounded-lg border border-emerald-100">
                                <span className="text-xs text-gray-500 block mb-1">كلمة المرور المؤقتة</span>
                                <span className="font-mono font-bold text-red-600" dir="ltr">{createdCredentials.temp_password}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setCreatedCredentials(null)} className="text-xs text-blue-600 underline">إخفاء</button>
                </div>
            )}

            {showForm && (
                <form
                    onSubmit={handleCreateUser}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">الاسم الكامل <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">البريد الإلكتروني (لتسجيل الدخول) <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all text-left"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم المستخدم (لتسجيل الدخول بدلاً من البريد) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all text-left"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            minLength={3}
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم الهاتف <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">المسمى الوظيفي (الدور)</label>
                        <select
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            {Object.entries(ROLES).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer w-full">
                            <input
                                type="checkbox"
                                checked={autoPassword}
                                onChange={(e) => setAutoPassword(e.target.checked)}
                                className="accent-blue-600 w-4 h-4"
                            />
                            توليد كلمة مرور مؤقتة تلقائيًا (موصى به)
                        </label>
                    </div>

                    {!autoPassword && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">كلمة المرور <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!autoPassword}
                                minLength={8}
                                dir="ltr"
                            />
                        </div>
                    )}

                    <div className="md:col-span-2 mt-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-3">الصلاحيات المخصصة (الموديولات المسموح بالوصول إليها)</label>
                        <div className="flex flex-wrap gap-3">
                            {AVAILABLE_MODULES.map((mod) => (
                                <label
                                    key={mod.id}
                                    className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 cursor-pointer transition-colors ${
                                        formData.permissions.includes(mod.id)
                                            ? "bg-blue-50 border-blue-200 text-blue-800"
                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.permissions.includes(mod.id)}
                                        onChange={(e) => {
                                            const perms = e.target.checked
                                                ? [...formData.permissions, mod.id]
                                                : formData.permissions.filter((p) => p !== mod.id);
                                            setFormData({ ...formData, permissions: perms });
                                        }}
                                        className="accent-blue-600 w-4 h-4 rounded"
                                    />
                                    <span className="text-xs font-semibold">{mod.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 flex gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                            إلغاء
                        </button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                            {loading ? "جاري الإنشاء..." : "إنشاء وحفظ المستخدم"}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <SearchFilterBar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="ابحث بالاسم أو اسم المستخدم أو الهاتف..."
                    filterLabel="كل الحالات"
                    filterValue={statusFilter}
                    filterOptions={[
                        { value: "true", label: "نشط" },
                        { value: "false", label: "معطل" },
                    ]}
                    onFilterChange={setStatusFilter}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                            <tr>
                                <th className="p-4">المستخدم</th>
                                <SortableHeader label="الدور الوظيفي" active={sortConfig.key === "role"} direction={sortConfig.direction} onClick={() => toggleSort("role")} />
                                <SortableHeader label="حالة الحساب" active={sortConfig.key === "is_active"} direction={sortConfig.direction} onClick={() => toggleSort("is_active")} />
                                <th className="p-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {processed.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center font-bold">
                                            {(emp.person?.full_name || emp.username || "?")[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{emp.person?.full_name || emp.username}</p>
                                            <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{emp.username}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${ROLES[emp.role]?.color || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                            {ROLES[emp.role]?.label || emp.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${emp.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                                            {emp.is_active ? "نشط" : "معطل"}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEdit(emp)}
                                                className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                تعديل
                                            </button>
                                            <button
                                                onClick={() => setResetModal({ open: true, id: emp.id, name: emp.person?.full_name || emp.username || "" })}
                                                className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                                            >
                                                <Key className="w-3.5 h-3.5" />
                                                كلمة المرور
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(emp)}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 border ${
                                                    emp.is_active
                                                        ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                }`}
                                            >
                                                <Power className="w-3.5 h-3.5" />
                                                {emp.is_active ? "تعطيل" : "تفعيل"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {processed.length === 0 && !loading && (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا يوجد موظفون بعد</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editModal.open && editModal.employee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleSaveEdit} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800 text-base">تعديل بيانات الموظف</h3>
                            <button type="button" onClick={() => setEditModal({ open: false, employee: null })} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم الهاتف</label>
                            <input
                                type="tel"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">المسمى الوظيفي</label>
                            <select
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500"
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                            >
                                {Object.entries(ROLES).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-3">الصلاحيات</label>
                            <div className="flex flex-wrap gap-3">
                                {AVAILABLE_MODULES.map((mod) => (
                                    <label
                                        key={mod.id}
                                        className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 cursor-pointer transition-colors ${
                                            editPermissions.includes(mod.id)
                                                ? "bg-blue-50 border-blue-200 text-blue-800"
                                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={editPermissions.includes(mod.id)}
                                            onChange={(e) => {
                                                const perms = e.target.checked
                                                    ? [...editPermissions, mod.id]
                                                    : editPermissions.filter((p) => p !== mod.id);
                                                setEditPermissions(perms);
                                            }}
                                            className="accent-blue-600 w-4 h-4 rounded"
                                        />
                                        <span className="text-xs font-semibold">{mod.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                            <button type="button" onClick={() => setEditModal({ open: false, employee: null })} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                                إلغاء
                            </button>
                            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {resetModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleResetPassword} className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800 text-base">تغيير كلمة المرور</h3>
                            <button type="button" onClick={() => setResetModal({ open: false, id: "", name: "" })} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            للمستخدم: <span className="font-bold text-gray-800">{resetModal.name}</span>
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">كلمة المرور الجديدة</label>
                            <input
                                type="password"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                dir="ltr"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                            <button type="button" onClick={() => setResetModal({ open: false, id: "", name: "" })} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                                إلغاء
                            </button>
                            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}