import { useState, useEffect, useMemo } from "react";
import { UserPlus, X, AlertTriangle, BookOpen, Loader2 } from "lucide-react";
import { partnersAPI, type PartnerRecord, type CreatePartnerPayload, type ProfitCalcResult, type LedgerEntry, type PendingWithdrawal } from "@/services/api";
import type { User } from "@/types/auth";
import SubmitButton from "@/components/SubmitButton";
import { Save, Send } from "lucide-react"; // optional icons
import SearchFilterBar from "@/components/SearchFilterBar";
import SortableHeader from "@/components/SortableHeader";

export default function PartnersPage({ currentUser }: { currentUser: User }) {
    // --- State ---
    const [partners, setPartners] = useState<PartnerRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // List filters
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
        key: "created_at", direction: "desc"
    });

    // Modals
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({
        full_name: "",
        phone: "",
        national_id: "",
        address: "",
        initial_deposit: 0,
        vault_id: "",
        lockup_end_date: ""
    });

    const [transactionModal, setTransactionModal] = useState<{ open: boolean; partner: PartnerRecord | null }>({ open: false, partner: null });
    const [transType, setTransType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
    const [transAmount, setTransAmount] = useState("");
    const [transVaultId, setTransVaultId] = useState("");

    // Profit distribution
    const [profitModal, setProfitModal] = useState(false);
    const [profitFrom, setProfitFrom] = useState("");
    const [profitTo, setProfitTo] = useState("");
    const [profitCalc, setProfitCalc] = useState<ProfitCalcResult | null>(null);
    const [orgSharePct, setOrgSharePct] = useState(0);
    const [payoutVaultId, setPayoutVaultId] = useState("");
    const [reinvestPartners, setReinvestPartners] = useState<Set<string>>(new Set());
    const [vaults, setVaults] = useState<{ id: string; name: string; balance: number }[]>([]);
    const [distributing, setDistributing] = useState(false);

    // Pending withdrawals for approvals
    const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
    const [showApprovals, setShowApprovals] = useState(false);

    // Ledger modal
    const [ledgerModal, setLedgerModal] = useState<{ open: boolean; partnerId: string; name: string }>({ open: false, partnerId: "", name: "" });
    const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);

    // Loading states for specific actions
    const [saving, setSaving] = useState(false);                 // add partner
    const [executingTransaction, setExecutingTransaction] = useState(false); // deposit/withdrawal

    // --- Load data ---
    const loadPartners = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await partnersAPI.list();
            setPartners(res.data.partners || []);
        } catch (err: any) {
            setError(err.message);
        } finally { setLoading(false); }
    };

    const loadVaults = async () => {
        try {
            const { posAPI } = await import("@/services/api");
            const res = await posAPI.listVaults();
            setVaults(res.data.vaults);
        } catch {}
    };

    const loadPendingWithdrawals = async () => {
        try {
            const res = await partnersAPI.getPendingWithdrawals();
            setPendingWithdrawals(res.data.pending || []);
        } catch {}
    };

    useEffect(() => { loadPartners(); loadVaults(); loadPendingWithdrawals(); }, []);

    // Refresh after important actions
    const refreshAll = () => {
        loadPartners();
        loadPendingWithdrawals();
    };

    // --- Sorting ---
    const toggleSort = (key: string) => {
        setSortConfig(prev => prev.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
    };

    const filteredPartners = useMemo(() => {
        let list = [...partners];
        if (search) {
            const s = search.toLowerCase();
            list = list.filter(p => (p.person?.full_name || "").includes(s) || (p.person?.phone || "").includes(s) || (p.person?.national_id || "").includes(s));
        }
        list.sort((a: any, b: any) => {
            const av = a[sortConfig.key], bv = b[sortConfig.key];
            if (av == null || bv == null) return 0;
            return sortConfig.direction === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
        });
        return list;
    }, [partners, search, sortConfig]);

    // --- Handlers ---
    const handleAddPartner = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!addForm.vault_id || addForm.initial_deposit <= 0) {
            setError("يجب اختيار الخزينة وإدخال مبلغ الإيداع الأول");
            return;
        }

        setSaving(true);
        try {
            const payload: CreatePartnerPayload = {
                full_name: addForm.full_name,
                phone: addForm.phone,
                national_id: addForm.national_id,
                address: addForm.address,
                initial_deposit: addForm.initial_deposit,
                vault_id: addForm.vault_id,
                lockup_end_date: addForm.lockup_end_date || undefined,
            };
            await partnersAPI.create(payload);
            setSuccess("تمت إضافة الشريك بنجاح");
            setShowAddForm(false);
            setAddForm({ full_name: "", phone: "", national_id: "", address: "", initial_deposit: 0, vault_id: "", lockup_end_date: "" });
            refreshAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transactionModal.partner) return;
        setError("");

        setExecutingTransaction(true);
        try {
            await partnersAPI.transactCapital({
                partner_id: transactionModal.partner.id,
                vault_id: transVaultId,
                amount: Number(transAmount),
                transaction_type: transType
            });
            setSuccess(transType === 'WITHDRAWAL' ? "تم تقديم طلب السحب في انتظار الموافقة" : "تمت العملية بنجاح");
            setTransactionModal({ open: false, partner: null });
            refreshAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setExecutingTransaction(false);
        }
    };

    const handleApprove = async (txId: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await partnersAPI.approveTransaction(txId, status);
            setSuccess(`تم ${status === 'APPROVED' ? 'اعتماد' : 'رفض'} المعاملة بنجاح`);
            refreshAll();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleCalculateProfit = async () => {
        if (!profitFrom || !profitTo) return;
        try {
            const res = await partnersAPI.calculateProfits(profitFrom, profitTo);
            setProfitCalc(res.data);
            setReinvestPartners(new Set());
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDistribute = async () => {
        if (!profitCalc || !payoutVaultId || orgSharePct < 0 || orgSharePct > 100) return;
        setDistributing(true);
        try {
            const res = await partnersAPI.distributeProfits({
                period_start: profitFrom,
                period_end: profitTo,
                organization_share_pct: orgSharePct,
                payout_vault_id: payoutVaultId,
                reinvesting_partner_ids: Array.from(reinvestPartners),
            });
            setSuccess(`تم التوزيع بنجاح...`);
            setProfitModal(false);
            setProfitCalc(null);
            refreshAll();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDistributing(false);
        }
    };

    const openLedger = async (partnerId: string, name: string) => {
        try {
            const res = await partnersAPI.getPartnerLedger(partnerId);
            setLedgerData(res.data.ledger);
            setLedgerModal({ open: true, partnerId, name });
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (currentUser.role !== "OWNER") {
        return <div className="p-10 text-center text-red-600">⛔ المالك فقط يمكنه الوصول لهذه الصفحة</div>;
    }

    return (
        <div className="font-sans space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><UserPlus className="text-blue-600" /> الشركاء والأرباح</h2>
                    <p className="text-sm text-gray-500">إدارة رأس المال وحصص الأرباح (مشاركة إسلامية)</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">إضافة شريك</button>
                    <button onClick={() => setProfitModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">توزيع الأرباح</button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{success}</div>}

            {/* Pending Withdrawal Approvals */}
            {pendingWithdrawals.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="text-amber-600 w-5 h-5" />
                        <h3 className="font-bold text-amber-800">طلبات سحب معلقة ({pendingWithdrawals.length})</h3>
                        <button onClick={() => setShowApprovals(!showApprovals)} className="text-xs text-amber-700 underline">
                            {showApprovals ? 'إخفاء' : 'عرض'}
                        </button>
                    </div>
                    {showApprovals && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-amber-700">
                                    <tr>
                                        <th className="p-2 text-right">الشريك</th>
                                        <th className="p-2 text-right">المبلغ</th>
                                        <th className="p-2 text-right">التاريخ</th>
                                        <th className="p-2 text-center">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingWithdrawals.map(tx => (
                                        <tr key={tx.id} className="border-t border-amber-100">
                                            <td className="p-2">{tx.partner?.person?.full_name || '—'}</td>
                                            <td className="p-2 font-bold">{tx.amount.toLocaleString()} ج.م</td>
                                            <td className="p-2 text-xs">{new Date(tx.created_at).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-2 text-center flex gap-1 justify-center">
                                                <button onClick={() => handleApprove(tx.id, 'APPROVED')} className="bg-green-600 text-white text-xs px-2 py-1 rounded">اعتماد</button>
                                                <button onClick={() => handleApprove(tx.id, 'REJECTED')} className="bg-red-600 text-white text-xs px-2 py-1 rounded">رفض</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Partner List Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <SearchFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث باسم أو رقم الهاتف..." />
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-500">
                        <tr>
                            <SortableHeader label="الشريك" active={sortConfig.key==="person"} direction={sortConfig.direction} onClick={()=>toggleSort("person")} />
                            <SortableHeader label="رأس المال الحالي" active={sortConfig.key==="current_capital"} direction={sortConfig.direction} onClick={()=>toggleSort("current_capital")} />
                            <SortableHeader label="نسبة الأرباح" active={sortConfig.key==="profit_share_percentage"} direction={sortConfig.direction} onClick={()=>toggleSort("profit_share_percentage")} />
                            <th className="p-3">الحالة</th>
                            <th className="p-3 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredPartners.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-3 font-medium">
                                    {p.person?.full_name}
                                    {p.lockup_end_date && new Date(p.lockup_end_date) > new Date() && (
                                        <span className="text-xs text-amber-600 block">حظر حتى {new Date(p.lockup_end_date).toLocaleDateString('ar-EG')}</span>
                                    )}
                                    <br/><span className="text-xs text-gray-500">{p.person?.phone}</span>
                                </td>
                                <td className="p-3 font-bold">{p.current_capital.toLocaleString()} ج.م</td>
                                <td className="p-3 text-blue-600 font-bold">{p.profit_share_percentage}%</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${p.status==='ACTIVE'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{p.status==='ACTIVE'?'نشط':'غير نشط'}</span></td>
                                <td className="p-3 text-center flex flex-wrap gap-1 justify-center">
                                    <button onClick={()=>setTransactionModal({open:true, partner:p})} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-100">إيداع/سحب</button>
                                    <button onClick={()=>openLedger(p.id, p.person?.full_name || 'شريك')} className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 flex items-center gap-1"><BookOpen size={14}/>كشف حساب</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Partner Modal */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleAddPartner} className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">إضافة شريك جديد</h3><button type="button" onClick={()=>setShowAddForm(false)} disabled={saving}><X/></button></div>
                        <div className="space-y-3">
                            <input type="text" placeholder="الاسم الكامل" className="w-full p-2 border rounded-lg" value={addForm.full_name} onChange={e=>setAddForm({...addForm,full_name:e.target.value})} required disabled={saving} />
                            <input type="tel" placeholder="رقم الهاتف" className="w-full p-2 border rounded-lg" value={addForm.phone} onChange={e=>setAddForm({...addForm,phone:e.target.value})} required disabled={saving} />
                            <input type="text" placeholder="الرقم القومي (اختياري)" className="w-full p-2 border rounded-lg" value={addForm.national_id} onChange={e=>setAddForm({...addForm,national_id:e.target.value})} disabled={saving} />
                            <input type="text" placeholder="العنوان" className="w-full p-2 border rounded-lg" value={addForm.address} onChange={e=>setAddForm({...addForm,address:e.target.value})} disabled={saving} />
                            
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <h4 className="text-sm font-bold mb-2 text-blue-800">الإيداع الأولي (رأس المال)</h4>
                                <input 
                                    type="number" 
                                    placeholder="المبلغ" 
                                    className="w-full p-2 border rounded-lg mb-2" 
                                    value={addForm.initial_deposit || ''} 
                                    onChange={e=>setAddForm({...addForm, initial_deposit: Number(e.target.value)})} 
                                    required min="1" 
                                    disabled={saving}
                                />
                                <select 
                                    className="w-full p-2 border rounded-lg mb-2" 
                                    value={addForm.vault_id} 
                                    onChange={e=>setAddForm({...addForm, vault_id: e.target.value})} 
                                    required
                                    disabled={saving}
                                >
                                    <option value="">اختر الخزينة</option>
                                    {vaults.map(v=><option key={v.id} value={v.id}>{v.name} ({v.balance.toLocaleString()} ج.م)</option>)}
                                </select>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded-lg" 
                                    value={addForm.lockup_end_date} 
                                    onChange={e=>setAddForm({...addForm, lockup_end_date: e.target.value})} 
                                    placeholder="تاريخ انتهاء الحظر (اختياري)"
                                    disabled={saving}
                                />
                                <p className="text-xs text-gray-500 mt-1">إذا حددت تاريخاً، لا يمكن للشريك السحب قبله</p>
                            </div>

                            <SubmitButton
                                label="حفظ"
                                loading={saving}
                                loadingLabel="جارٍ الحفظ..."
                                icon={<Save size={16} />}
                                variant="primary"
                                className="w-full"
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Transaction Modal */}
            {transactionModal.open && transactionModal.partner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <form onSubmit={handleTransaction} className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">معاملة مالية - {transactionModal.partner.person?.full_name}</h3><button type="button" onClick={()=>setTransactionModal({open:false,partner:null})} disabled={executingTransaction}><X/></button></div>
                        <div className="space-y-3">
                            <select value={transType} onChange={e=>setTransType(e.target.value as any)} className="w-full p-2 border rounded-lg" disabled={executingTransaction}>
                                <option value="DEPOSIT">إيداع (زيادة رأس المال)</option>
                                <option value="WITHDRAWAL">سحب (تخفيض رأس المال)</option>
                            </select>
                            <input type="number" placeholder="المبلغ" className="w-full p-2 border rounded-lg" value={transAmount} onChange={e=>setTransAmount(e.target.value)} required min="1" disabled={executingTransaction} />
                            <select value={transVaultId} onChange={e=>setTransVaultId(e.target.value)} className="w-full p-2 border rounded-lg" required disabled={executingTransaction}>
                                <option value="">اختر الخزينة</option>
                                {vaults.map(v=><option key={v.id} value={v.id}>{v.name} ({v.balance.toLocaleString()} ج.م)</option>)}
                            </select>
                            {transType === 'WITHDRAWAL' && transactionModal.partner.lockup_end_date && new Date(transactionModal.partner.lockup_end_date) > new Date() && (
                                <p className="text-amber-600 text-xs">⚠️ هذا الشريك لا يزال في فترة حظر حتى {new Date(transactionModal.partner.lockup_end_date).toLocaleDateString('ar-EG')}</p>
                            )}
                            <SubmitButton
                                label="تنفيذ"
                                loading={executingTransaction}
                                loadingLabel="جارٍ التنفيذ..."
                                icon={<Send size={16} />}
                                variant="primary"
                                className="w-full"
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Profit Distribution Modal – unchanged, but you can add similar loading for distribute if desired */}
            {profitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between mb-4"><h3 className="font-bold">توزيع الأرباح</h3><button onClick={()=>setProfitModal(false)}><X/></button></div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" className="p-2 border rounded-lg" value={profitFrom} onChange={e=>setProfitFrom(e.target.value)} placeholder="من تاريخ" />
                                <input type="date" className="p-2 border rounded-lg" value={profitTo} onChange={e=>setProfitTo(e.target.value)} placeholder="إلى تاريخ" />
                            </div>
                            <button onClick={handleCalculateProfit} className="w-full bg-gray-100 py-2 rounded-lg font-medium">حساب الأرباح</button>

                            {profitCalc && (
                                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                                    <p>إجمالي المحصل: {profitCalc.total_collected.toLocaleString()} ج.م</p>
                                    <p>إجمالي المصروفات: {profitCalc.total_expenses.toLocaleString()} ج.م</p>
                                    <p className="font-bold text-lg">صافي الربح: {profitCalc.net_profit.toLocaleString()} ج.م</p>
                                </div>
                            )}

                            {profitCalc && profitCalc.net_profit > 0 && (
                                <>
                                    <div>
                                        <label className="text-xs font-semibold">نسبة المؤسسة (%)</label>
                                        <input type="number" className="w-full p-2 border rounded-lg" value={orgSharePct} onChange={e=>setOrgSharePct(Number(e.target.value))} min="0" max="100" />
                                        <p className="text-xs text-gray-500">حصة المؤسسة: {(profitCalc.net_profit * orgSharePct / 100).toLocaleString()} ج.م</p>
                                        <p className="text-xs text-blue-600">المتبقي للشركاء: {(profitCalc.net_profit - (profitCalc.net_profit * orgSharePct / 100)).toLocaleString()} ج.م</p>
                                    </div>

                                    {/* Partner list with reinvestment checkboxes */}
                                    <div className="bg-white border rounded-lg p-3">
                                        <h4 className="font-bold text-sm mb-2">اختر الشركاء لإعادة استثمار أرباحهم</h4>
                                        <div className="max-h-40 overflow-y-auto space-y-2">
                                            {partners.filter(p => p.status === 'ACTIVE' && p.profit_share_percentage > 0).map(p => {
                                                const estimatedPayout = (profitCalc.net_profit * (1 - orgSharePct/100) * p.profit_share_percentage) / 100;
                                                return (
                                                    <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={reinvestPartners.has(p.id)} 
                                                            onChange={e => {
                                                                const newSet = new Set(reinvestPartners);
                                                                e.target.checked ? newSet.add(p.id) : newSet.delete(p.id);
                                                                setReinvestPartners(newSet);
                                                            }} 
                                                        />
                                                        <span className="flex-1">{p.person?.full_name}</span>
                                                        <span className="text-xs text-gray-500">ربح ≈ {Math.round(estimatedPayout).toLocaleString()} ج.م</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold">خزينة الدفع</label>
                                        <select className="w-full p-2 border rounded-lg" value={payoutVaultId} onChange={e=>setPayoutVaultId(e.target.value)} required>
                                            <option value="">اختر الخزينة</option>
                                            {vaults.map(v=><option key={v.id} value={v.id}>{v.name} ({v.balance.toLocaleString()})</option>)}
                                        </select>
                                    </div>
                                    <SubmitButton
                                        label="تأكيد التوزيع"
                                        loading={distributing}
                                        loadingLabel="جارٍ التوزيع..."
                                        variant="success"
                                        className="w-full"
                                        onClick={handleDistribute}
                                        type="button"
                                    />                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Ledger Modal */}
            {ledgerModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-xl shadow-xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2"><BookOpen className="w-5 h-5" /> كشف حساب - {ledgerModal.name}</h3>
                            <button onClick={()=>setLedgerModal({open:false, partnerId:"", name:""})}><X/></button>
                        </div>
                        {ledgerData.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">لا توجد حركات حتى الآن</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-gray-500">
                                    <tr>
                                        <th className="p-2 text-right">التاريخ</th>
                                        <th className="p-2 text-right">البيان</th>
                                        <th className="p-2 text-right">المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {ledgerData.map(entry => (
                                        <tr key={entry.id}>
                                            <td className="p-2">{new Date(entry.date).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-2">{entry.description}</td>
                                            <td className={`p-2 font-bold ${entry.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                {entry.amount.toLocaleString()} ج.م
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}