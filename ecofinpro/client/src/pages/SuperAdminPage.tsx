import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Key, Building, LogOut, Trash, Plus, Activity, UserPlus, Check, Search, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '@/services/api';

// ─── Data Types ────────────────────────────────────────────────
interface License {
    id: string;
    license_key: string;
    plan_name: string;
    max_branches: number;
    max_employees: number;
    valid_months: number;
    is_used: boolean;
    claimed_by_org_id?: string | null;
    created_at: string;
}

interface Organization {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
    is_active: boolean;
    created_at: string;
    license_key?: string;
}

interface Admin {
    id: string;
    full_name: string;
    phone?: string | null;
    auth_id?: string | null;
    created_at: string;
}

type TabData = License[] | Organization[] | Admin[];

interface CredentialField {
    label: string;
    value: string;
    sensitive?: boolean;
}
type CredentialsCard = {
    title: string;
    fields: CredentialField[];
} | null;

export default function SuperAdminPage() {
    const navigate = useNavigate();
    const [authLoading, setAuthLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'licenses' | 'organizations' | 'admins'>('licenses');
    const [data, setData] = useState<TabData>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [credentialsCard, setCredentialsCard] = useState<CredentialsCard>(null);
    const [generatePassword, setGeneratePassword] = useState(true);

    // Search, filter, sort states
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'created_at',
        direction: 'desc',
    });

    // ─── Session check & logout ─────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                // Check if we have a valid token
                const token = localStorage.getItem('ecofine_auth_token');
                if (!token) {
                    navigate('/login', { replace: true });
                    return;
                }
                
                // Verify session through backend
                const session = await superAdminAPI.getSession();
                if (!session?.data?.session) {
                    navigate('/login', { replace: true });
                    return;
                }
                
                setAuthLoading(false);
            } catch {
                navigate('/login', { replace: true });
            }
        })();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await superAdminAPI.logout();
        } catch {
            // Continue with local cleanup even if API call fails
        } finally {
            localStorage.removeItem('ecofine_auth_token');
            localStorage.removeItem('ecofine_session');
            localStorage.removeItem('ecofine_last_activity');
            navigate('/login', { replace: true });
        }
    };

    // ─── Data fetching ──────────────────────────────────────────
    const fetchData = async (tab: string) => {
        setLoading(true);
        setError('');
        try {
        if (tab === 'organizations') {
            const [orgRes, licRes] = await Promise.all([
            superAdminAPI.getOrganizations(),
            superAdminAPI.getLicenses(),
            ]);
            const orgs: Organization[] = (orgRes.data as { organizations: Organization[] }).organizations || [];
            const licenses: License[] = (licRes.data as { licenses: License[] }).licenses || [];
            const enriched = orgs.map((org) => {
            const lic = licenses.find((l) => l.claimed_by_org_id === org.id);
            return { ...org, license_key: lic?.license_key || '—' };
            });
            setData(enriched as TabData);
            setOrganizations(orgs);
        } else if (tab === 'licenses') {
            const res = await superAdminAPI.getLicenses();
            setData((res.data as { licenses: License[] }).licenses || []);
        } else if (tab === 'admins') {
            const res = await superAdminAPI.getAdmins();
            setData((res.data as { admins: Admin[] }).admins || []);
        }
        } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(activeTab);
    }, [activeTab]);

    useEffect(() => {
        superAdminAPI.getOrganizations()
        .then((res) => setOrganizations((res.data as { organizations: Organization[] }).organizations || []))
        .catch(() => { /* non‑fatal */ });
    }, []);

    // ─── CRUD Handlers ──────────────────────────────────────────
    const handleCreateLicense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const payload = {
            org_name: fd.get('org_name') as string,
            org_phone: fd.get('org_phone') as string,
            org_address: fd.get('org_address') as string,
            owner_name: fd.get('owner_name') as string,
            owner_phone: fd.get('owner_phone') as string,
            owner_email: fd.get('owner_email') as string,
            plan_name: fd.get('plan_name') as typeof PLANS[number],
        };

        if (!payload.org_name || !payload.owner_name || !payload.owner_email || !payload.org_phone) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
        }

        try {
        const response = await superAdminAPI.createLicense(payload);
        const d = response.data as {
            license: { license_key: string };
            owner_credentials: { owner_email: string; temp_password: string };
        };

        setCredentialsCard({
            title: 'تم إنشاء المؤسسة والترخيص بنجاح! قم بنسخ هذه البيانات وإرسالها للمالك:',
            fields: [
            { label: 'مفتاح الترخيص', value: d.license.license_key },
            { label: 'البريد الإلكتروني', value: d.owner_credentials.owner_email },
            { label: 'كلمة المرور المؤقتة', value: d.owner_credentials.temp_password, sensitive: true },
            ],
        });

        form.reset();
        fetchData(activeTab);
        } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'فشلت العملية');
        }
    };

    const handleDeleteLicense = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الترخيص؟')) return;
        try {
        await superAdminAPI.deleteLicense(id);
        fetchData(activeTab);
        } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'فشل الحذف');
        }
    };

    const handleToggleOrganization = async (id: string, currentStatus: boolean) => {
        if (!confirm(`هل أنت متأكد من ${currentStatus ? 'تعطيل' : 'تفعيل'} هذه المؤسسة؟`)) return;
        try {
        await superAdminAPI.toggleOrgStatus(id, { is_active: !currentStatus });
        fetchData(activeTab);
        } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'فشل تغيير الحالة');
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const payload: Record<string, unknown> = {
        email: fd.get('email'),
        full_name: fd.get('full_name'),
        phone: fd.get('phone'),
        organization_id: fd.get('organization_id'),
        };

        if (!payload.email || !payload.full_name || !payload.organization_id) {
        alert('يرجى ملء البريد الإلكتروني والاسم والمؤسسة');
        return;
        }

        if (!generatePassword) {
        const pass = fd.get('password') as string;
        if (!pass || pass.length < 8) {
            alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
            return;
        }
        payload.password = pass;
        }

        try {
        const response = await superAdminAPI.createAdmin(payload);
        const d = response.data as {
            credentials?: { email: string; temp_password: string };
        };
        if (d.credentials) {
            setCredentialsCard({
            title: 'تم إنشاء المشرف بنجاح! قم بنسخ بيانات الدخول وإرسالها له:',
            fields: [
                { label: 'البريد الإلكتروني', value: d.credentials.email },
                { label: 'كلمة المرور المؤقتة', value: d.credentials.temp_password, sensitive: true },
            ],
            });
        }
        form.reset();
        setGeneratePassword(true);
        fetchData(activeTab);
        } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'فشل إنشاء المشرف');
        }
    };

    const handleDeleteAdmin = async (id: string) => {
        if (!confirm('هل أنت متأكد من إزالة هذا المشرف؟')) return;
        try {
        await superAdminAPI.deleteAdmin(id);
        fetchData(activeTab);
        } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'فشل الحذف');
        }
    };

    // ─── Sorting & Filtering Logic ──────────────────────────────
    const toggleSort = (key: string) => {
        setSortConfig((prev) =>
        prev.key === key
            ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: 'asc' }
        );
    };

    const processedData = useMemo(() => {
        let filtered: unknown[] = [...data];

        if (search) {
        const s = search.toLowerCase();
        const keys =
            activeTab === 'licenses' ? ['license_key', 'plan_name'] :
            activeTab === 'organizations' ? ['name', 'owner_name', 'phone', 'license_key'] :
            ['full_name', 'phone', 'auth_id'];
        filtered = filtered.filter((item) =>
            keys.some((k) => String((item as Record<string, unknown>)[k] ?? '').toLowerCase().includes(s))
        );
        }

        if (activeTab === 'licenses' && statusFilter !== 'all') {
        const isUsed = statusFilter === 'true';
        filtered = filtered.filter((item) => (item as License).is_used === isUsed);
        }
        if (activeTab === 'organizations' && statusFilter !== 'all') {
        const isActive = statusFilter === 'true';
        filtered = filtered.filter((item) => (item as Organization).is_active === isActive);
        }

        filtered.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortConfig.key];
        const bVal = (b as Record<string, unknown>)[sortConfig.key];
        if (aVal == null || bVal == null) return 0;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
        });

        return filtered;
    }, [data, search, statusFilter, sortConfig, activeTab]);

    // ─── Render helpers ─────────────────────────────────────────
    const renderCredentialsCard = () =>
        credentialsCard && (
        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm space-y-2 animate-in fade-in">
            <div className="font-bold flex items-center gap-2">
            <Check size={16} /> {credentialsCard.title}
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-${credentialsCard.fields.length} gap-4 mt-2`}>
            {credentialsCard.fields.map((f) => (
                <div key={f.label} className="bg-white p-3 rounded border border-emerald-100 shadow-sm">
                <span className="text-xs text-gray-500 block mb-1">{f.label}</span>
                <span className={`font-mono font-bold text-sm break-all ${f.sensitive ? 'text-red-600' : 'text-blue-600'}`} dir="ltr">
                    {f.value}
                </span>
                </div>
            ))}
            </div>
            <button onClick={() => setCredentialsCard(null)} className="mt-2 text-xs text-blue-600 underline hover:text-blue-800 font-medium">
            إخفاء
            </button>
        </div>
        );

    const SortableHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
        <th
        className="p-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
        onClick={() => toggleSort(sortKey)}
        >
        <div className="flex items-center gap-1">
            {label}
            {sortConfig.key === sortKey && (
            <ArrowUpDown size={14} className={sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-blue-600 rotate-180'} />
            )}
        </div>
        </th>
    );

    const SearchBar = ({ placeholder }: { placeholder: string }) => (
        <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        <input
            type="text"
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
        </div>
    );

    const StatusFilter = ({ options }: { options: { value: string; label: string }[] }) => (
        <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
        >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        </select>
    );

    // ─── Tab content ────────────────────────────────────────────
    const renderLicenses = () => (
        <div className="space-y-6">
        {/* Creation form */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Plus className="text-blue-600" size={20} />
            إنشاء مؤسسة وترخيص جديد
            </h3>
            <form onSubmit={handleCreateLicense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم المؤسسة *</label>
                <input type="text" name="org_name" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">عنوان المؤسسة *</label>
                <input type="text" name="org_address" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">هاتف المؤسسة *</label>
                <input type="text" name="org_phone" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">اسم المالك *</label>
                <input type="text" name="owner_name" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">هاتف المالك *</label>
                <input type="text" name="owner_phone" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">البريد الإلكتروني للمالك *</label>
                <input type="email" name="owner_email" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">خطة الاشتراك *</label>
                <select name="plan_name" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white">
                <option value="STARTER">أساسي (STARTER)</option>
                <option value="PROFESSIONAL">احترافي (PROFESSIONAL)</option>
                <option value="ENTERPRISE">شركات (ENTERPRISE)</option>
                </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors shadow-sm">
                <Plus size={18} />
                <span>إنشاء المؤسسة والترخيص</span>
                </button>
            </div>
            </form>
            {renderCredentialsCard()}
        </div>

        {/* Search & filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4">
            <SearchBar placeholder="ابحث بمفتاح الترخيص أو الخطة..." />
            <StatusFilter options={[
            { value: 'all', label: 'كل الحالات' },
            { value: 'true', label: 'مستخدم' },
            { value: 'false', label: 'غير مستخدم' },
            ]} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-700">
                <tr>
                <SortableHeader label="مفتاح الترخيص" sortKey="license_key" />
                <SortableHeader label="الخطة" sortKey="plan_name" />
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {processedData.map((item) => {
                const lic = item as License;
                return (
                    <tr key={lic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-blue-600 font-medium">{lic.license_key}</td>
                    <td className="p-3 capitalize">{lic.plan_name}</td>
                    <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${lic.is_used ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {lic.is_used ? 'مستخدم' : 'غير مستخدم'}
                        </span>
                    </td>
                    <td className="p-3">
                        {!lic.is_used && (
                        <button onClick={() => handleDeleteLicense(lic.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors" title="حذف">
                            <Trash size={18} />
                        </button>
                        )}
                    </td>
                    </tr>
                );
                })}
                {processedData.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد نتائج مطابقة</td></tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    );

    const renderOrganizations = () => (
        <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4">
            <SearchBar placeholder="ابحث بالاسم أو المالك أو الهاتف..." />
            <StatusFilter options={[
            { value: 'all', label: 'كل الحالات' },
            { value: 'true', label: 'نشط' },
            { value: 'false', label: 'معطل' },
            ]} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-700">
                <tr>
                <SortableHeader label="المؤسسة" sortKey="name" />
                <SortableHeader label="المالك" sortKey="owner_name" />
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">الترخيص المرتبط</th>
                <SortableHeader label="الحالة" sortKey="is_active" />
                <th className="p-3">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {processedData.map((item) => {
                const org = item as Organization;
                return (
                    <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium">{org.name}</td>
                    <td className="p-3">{org.owner_name}</td>
                    <td className="p-3" dir="ltr">{org.phone}</td>
                    <td className="p-3 font-mono text-xs text-gray-600">{org.license_key}</td>
                    <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                        {org.is_active ? 'نشط' : 'معطل'}
                        </span>
                    </td>
                    <td className="p-3">
                        <button
                        onClick={() => handleToggleOrganization(org.id, org.is_active)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${org.is_active ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                        >
                        <Activity size={14} />
                        {org.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                    </td>
                    </tr>
                );
                })}
                {processedData.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد نتائج مطابقة</td></tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    );

    const renderAdmins = () => (
        <div className="space-y-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <UserPlus className="text-blue-600" size={20} />
            إضافة مشرف جديد
            </h3>
            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">البريد الإلكتروني (لتسجيل الدخول) *</label>
                <input type="email" name="email" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">الاسم الكامل *</label>
                <input type="text" name="full_name" required className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">رقم الهاتف</label>
                <input type="text" name="phone" className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">المؤسسة *</label>
                <select name="organization_id" required defaultValue="" className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white">
                <option value="" disabled>اختر المؤسسة</option>
                {organizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                ))}
                </select>
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-100">
                <input
                type="checkbox"
                id="generatePassword"
                checked={generatePassword}
                onChange={(e) => setGeneratePassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="generatePassword" className="cursor-pointer select-none">توليد كلمة مرور مؤقتة آمنة تلقائيًا (موصى به)</label>
            </div>

            {!generatePassword && (
                <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">كلمة المرور *</label>
                <input type="password" name="password" required minLength={8} className="w-full border border-gray-200 rounded-md p-2.5 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" dir="ltr" placeholder="8 أحرف على الأقل" />
                </div>
            )}

            <div className="md:col-span-2 lg:col-span-4 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-md hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors shadow-sm">
                <UserPlus size={18} />
                <span>إضافة مشرف</span>
                </button>
            </div>
            </form>
            {renderCredentialsCard()}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-4">
            <SearchBar placeholder="ابحث بالاسم أو الهاتف..." />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-700">
                <tr>
                <SortableHeader label="الاسم الكامل" sortKey="full_name" />
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">معرف المصادقة</th>
                <th className="p-3">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {processedData.map((item) => {
                const admin = item as Admin;
                return (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium">{admin.full_name}</td>
                    <td className="p-3" dir="ltr">{admin.phone || '—'}</td>
                    <td className="p-3 font-mono text-xs text-gray-500 break-all" dir="ltr">{admin.auth_id || '—'}</td>
                    <td className="p-3">
                        <button onClick={() => handleDeleteAdmin(admin.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors" title="حذف المشرف">
                        <Trash size={18} />
                        </button>
                    </td>
                    </tr>
                );
                })}
                {processedData.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد نتائج مطابقة</td></tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    );

    if (authLoading) {
        return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <span className="animate-pulse text-gray-500 font-medium">جاري التحقق من الصلاحية...</span>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800" dir="rtl">
        <nav className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-3">
            <Shield className="text-blue-400" size={28} />
            <h1 className="text-xl font-bold tracking-wide">لوحة التحكم الإدارية (Super Admin)</h1>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors text-sm font-medium">
            <span>تسجيل الخروج</span>
            <LogOut size={18} />
            </button>
        </nav>

        <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-6">
            <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex flex-col gap-1 sticky top-24">
                {([
                { id: 'licenses', icon: Key, label: 'التراخيص' },
                { id: 'organizations', icon: Building, label: 'المؤسسات' },
                { id: 'admins', icon: Shield, label: 'المشرفون' },
                ] as const).map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setCredentialsCard(null); setSearch(''); setStatusFilter('all'); }}
                    className={`flex items-center gap-3 p-3 rounded-md transition-all text-sm font-medium ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                    <Icon size={18} /> {tab.label}
                    </button>
                );
                })}
            </div>
            </aside>

            <main className="flex-1 min-w-0">
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200 flex items-center gap-2">
                <span className="font-bold">خطأ:</span> {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-20 text-gray-400">
                <span className="animate-pulse">جاري تحميل البيانات...</span>
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                {activeTab === 'licenses' && renderLicenses()}
                {activeTab === 'organizations' && renderOrganizations()}
                {activeTab === 'admins' && renderAdmins()}
                </div>
            )}
            </main>
        </div>
        </div>
    );
}