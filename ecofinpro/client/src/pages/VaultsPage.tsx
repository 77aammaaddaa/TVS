import { useState, useEffect } from "react";
import { Building2, Plus, ArrowRightLeft, Eye, Edit, Pencil, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { vaultsManageAPI, type VaultRecord } from "@/services/api";
import SubmitButton from "@/components/SubmitButton";

export default function VaultsPage() {
    const [vaults, setVaults] = useState<VaultRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Create / Edit modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formName, setFormName] = useState("");

    // Transfer modal
    const [transferOpen, setTransferOpen] = useState(false);
    const [fromVault, setFromVault] = useState("");
    const [toVault, setToVault] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDesc, setTransferDesc] = useState("");

    // Ledger view
    const [ledgerVault, setLedgerVault] = useState<VaultRecord | null>(null);
    const [ledgerData, setLedgerData] = useState<any[]>([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    const loadVaults = async () => {
        setLoading(true);
        try {
            const res = await vaultsManageAPI.list();
            setVaults(res.data.vaults || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadVaults(); }, []);

    const openCreate = () => {
        setEditMode(false);
        setEditId(null);
        setFormName("");
        setModalOpen(true);
    };

    const openEdit = (v: VaultRecord) => {
        setEditMode(true);
        setEditId(v.id);
        setFormName(v.name);
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            if (editMode && editId) {
                await vaultsManageAPI.update(editId, { name: formName });
                setSuccess("تم تحديث الخزينة");
            } else {
                await vaultsManageAPI.create({ name: formName });
                setSuccess("تم إنشاء الخزينة");
            }
            setModalOpen(false);
            loadVaults();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromVault || !toVault || !transferAmount) return;
        setActionLoading(true);
        try {
            await vaultsManageAPI.transfer({
                source_vault_id: fromVault,
                destination_vault_id: toVault,
                amount: Number(transferAmount),
                description: transferDesc,
            });
            setSuccess("تم التحويل بنجاح");
            setTransferOpen(false);
            loadVaults();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const openLedger = async (v: VaultRecord) => {
        setLedgerVault(v);
        setLedgerLoading(true);
        try {
            const res = await vaultsManageAPI.getLedger(v.id);
            setLedgerData(res.data.transactions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLedgerLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

    return (
        <div className="font-sans p-6 max-w-7xl mx-auto" dir="rtl">
            {/* Notifications */}
            {error && <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm"><AlertCircle className="w-5 h-5" />{error}</div>}
            {success && <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 font-bold text-sm"><CheckCircle2 className="w-5 h-5" />{success}</div>}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Building2 className="text-blue-600" /> إدارة الخزائن</h2>
                <div className="flex gap-2">
                    <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> خزينة جديدة</button>
                    <button onClick={() => setTransferOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> تحويل</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vaults.map(v => (
                    <div key={v.id} className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 ${v.is_main_vault ? 'border-amber-300' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">{v.name} {v.is_main_vault && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">رئيسية</span>}</h3>
                                <p className="text-sm text-gray-500">{v.is_active ? 'نشطة' : 'غير نشطة'}</p>
                            </div>
                            <div className="flex gap-1">
                                {!v.is_main_vault && (
                                    <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                )}
                                <button onClick={() => openLedger(v)} className="p-1.5 text-gray-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-2xl font-black text-blue-600">{Number(v.balance).toLocaleString()} ج.م</div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between"><h3 className="font-bold">{editMode ? 'تعديل' : 'إضافة'} خزينة</h3><button type="button" onClick={() => setModalOpen(false)}><X size={20}/></button></div>
                        <input className="w-full p-3 border rounded-xl" placeholder="اسم الخزينة" value={formName} onChange={e => setFormName(e.target.value)} required />
                        <SubmitButton label={editMode ? "تحديث" : "إنشاء"} loading={actionLoading} className="w-full" />
                    </form>
                </div>
            )}

            {/* Transfer Modal */}
            {transferOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleTransfer} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
                        <div className="flex justify-between"><h3 className="font-bold">تحويل بين الخزائن</h3><button type="button" onClick={() => setTransferOpen(false)}><X size={20}/></button></div>
                        <select className="w-full p-3 border rounded-xl" value={fromVault} onChange={e => setFromVault(e.target.value)} required>
                            <option value="">من خزينة</option>
                            {vaults.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance})</option>)}
                        </select>
                        <select className="w-full p-3 border rounded-xl" value={toVault} onChange={e => setToVault(e.target.value)} required>
                            <option value="">إلى خزينة</option>
                            {vaults.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name} ({v.balance})</option>)}
                        </select>
                        <input type="number" className="w-full p-3 border rounded-xl" placeholder="المبلغ" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
                        <input type="text" className="w-full p-3 border rounded-xl" placeholder="وصف (اختياري)" value={transferDesc} onChange={e => setTransferDesc(e.target.value)} />
                        <SubmitButton label="تنفيذ التحويل" loading={actionLoading} className="w-full" />
                    </form>
                </div>
            )}

            {/* Ledger Modal */}
            {ledgerVault && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">سجل حركات {ledgerVault.name}</h3><button onClick={() => setLedgerVault(null)}><X size={20}/></button></div>
                        {ledgerLoading ? <Loader2 className="animate-spin mx-auto" /> : (
                            <table className="w-full text-sm"><thead><tr><th className="p-2">التاريخ</th><th className="p-2">النوع</th><th className="p-2">المبلغ</th><th className="p-2">الوصف</th></tr></thead>
                                <tbody>{ledgerData.map(tx => (
                                    <tr key={tx.id}><td className="p-2">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</td><td className="p-2">{tx.transaction_type}</td><td className="p-2">{tx.amount}</td><td className="p-2">{tx.description}</td></tr>
                                ))}</tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}