import { useState, useEffect } from "react";
import {
    Truck, Search, Plus, Pencil, Trash2, Phone, MapPin, Building, X,
    Loader2, AlertCircle, CheckCircle, FileText, Eye
} from "lucide-react";
import { suppliersAPI, type SupplierRecord, type SupplierStatement } from "@/services/api";
import SubmitButton from "@/components/SubmitButton";

interface SupplierForm {
    name: string;
    phone: string;
    address: string;
}

const emptyForm: SupplierForm = { name: "", phone: "", address: "" };

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Modal state (add/edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<SupplierForm>(emptyForm);
    const [actionLoading, setActionLoading] = useState(false);

    // Statement modal
    const [statementOpen, setStatementOpen] = useState(false);
    const [statementSupplier, setStatementSupplier] = useState<SupplierRecord | null>(null);
    const [statement, setStatement] = useState<SupplierStatement | null>(null);
    const [statementLoading, setStatementLoading] = useState(false);

    const loadSuppliers = async (search?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await suppliersAPI.list(search);
            setSuppliers(res.data.suppliers || []);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "فشل تحميل الموردين");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Search with debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            loadSuppliers(searchQuery);
        }, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    const openAddModal = () => {
        setEditMode(false);
        setEditingId(null);
        setFormData(emptyForm);
        setIsModalOpen(true);
    };

    const openEditModal = (supplier: SupplierRecord) => {
        setEditMode(true);
        setEditingId(supplier.id);
        setFormData({
            name: supplier.name,
            phone: supplier.phone,
            address: supplier.address || "",
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError(null);
        try {
            if (editMode && editingId) {
                await suppliersAPI.update(editingId, formData);
                setSuccess("تم تحديث بيانات المورد بنجاح");
            } else {
                await suppliersAPI.create(formData);
                setSuccess("تم إضافة المورد بنجاح");
            }
            setIsModalOpen(false);
            loadSuppliers();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "فشل حفظ المورد");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!confirm("هل أنت متأكد من تعطيل هذا المورد؟")) return;
        try {
            await suppliersAPI.deactivate(id);
            setSuccess("تم تعطيل المورد");
            loadSuppliers();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "فشل تعطيل المورد");
        }
    };

    const openStatement = async (supplier: SupplierRecord) => {
        setStatementSupplier(supplier);
        setStatementOpen(true);
        setStatementLoading(true);
        setStatement(null);
        try {
            const res = await suppliersAPI.getStatement(supplier.id);
            setStatement(res.data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "فشل تحميل كشف الحساب");
            setStatementOpen(false);
        } finally {
            setStatementLoading(false);
        }
    };

    return (
        <div className="font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600 w-6 h-6" />
                        إدارة الموردين
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        سجل الموردين المعتمدين وبيانات التواصل الخاصة بهم
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة مورد جديد
                </button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 font-bold text-sm text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 font-bold text-sm text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    {success}
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ابحث عن مورد بالاسم أو رقم الهاتف..."
                        className="w-full pl-4 pr-10 p-2.5 rounded-xl border border-gray-200 outline-none focus:border-blue-500 transition-all text-sm font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Suppliers Grid */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : suppliers.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 font-bold">
                        {searchQuery ? "لا توجد نتائج مطابقة" : "لا يوجد موردين مسجلين بعد"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map((s) => (
                        <div
                            key={s.id}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group overflow-hidden"
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            <Building className="w-5 h-5 text-gray-400" />
                                            {s.name}
                                        </h4>
                                    </div>
                                    <div className="flex gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                                        <button
                                            onClick={() => openStatement(s)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                            title="كشف حساب"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(s)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="تعديل"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeactivate(s.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            title="تعطيل"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5" /> الهاتف
                                        </span>
                                        <span className="font-medium text-gray-800" dir="ltr">
                                            {s.phone || "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-xs flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> العنوان
                                        </span>
                                        <span
                                            className="font-medium text-gray-800 text-xs text-left max-w-[150px] truncate"
                                            title={s.address}
                                        >
                                            {s.address || "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Truck className="text-blue-600 w-5 h-5" />
                                {editMode ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                    اسم المورد <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="مثال: شركة الأمل للتجارة"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                    رقم الهاتف <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="tel"
                                    placeholder="01xxxxxxxxx"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    dir="ltr"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                    العنوان
                                </label>
                                <input
                                    type="text"
                                    placeholder="العنوان الكامل"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-md font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <SubmitButton
                                    type="submit"
                                    label={editMode ? "تحديث" : "حفظ"}
                                    loading={actionLoading}
                                    variant="primary"
                                />
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Statement Modal */}
            {statementOpen && statementSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-100">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <FileText className="text-indigo-600 w-5 h-5" />
                                كشف حساب {statementSupplier.name}
                            </h3>
                            <button onClick={() => setStatementOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {statementLoading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : statement && statement.invoices.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                                                <tr>
                                                    <th className="p-3">الفاتورة</th>
                                                    <th className="p-3">التاريخ</th>
                                                    <th className="p-3">الإجمالي</th>
                                                    <th className="p-3">المسدد</th>
                                                    <th className="p-3">المتبقي</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {statement.invoices.map((inv) => (
                                                    <tr key={inv.id} className="hover:bg-gray-50">
                                                        <td className="p-3 font-mono text-xs">{inv.id.slice(0, 8)}</td>
                                                        <td className="p-3">{new Date(inv.created_at).toLocaleDateString("ar-EG")}</td>
                                                        <td className="p-3">{inv.total_amount.toLocaleString()} ج.م</td>
                                                        <td className="p-3 text-emerald-600">{inv.amount_paid.toLocaleString()} ج.م</td>
                                                        <td className="p-3 font-bold text-red-600">{inv.outstanding_amount.toLocaleString()} ج.م</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center font-bold text-lg">
                                        <span className="text-red-700">إجمالي المستحق</span>
                                        <span className="text-red-800">{statement.totalOutstanding.toLocaleString()} ج.م</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-10 text-gray-500">
                                    لا توجد فواتير مستحقة لهذا المورد
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}