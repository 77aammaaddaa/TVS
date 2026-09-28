// client/src/pages/SettingsPage.tsx
import { useState, useEffect, useMemo, useCallback } from "react"
import type { User } from "@/types/auth"
import { settingsAPI } from "@/services/api"
import { Settings as SettingsIcon, ShieldAlert, AlertTriangle, Bug, HardDrive } from "lucide-react"

interface SettingsProps {
    currentUser: User
}

interface ConfigData {
    identity?: {
        storeName?: string
        currency?: string
        themeColor?: string
    }
    creditPolicy?: {
        minScoreToEntry?: number
        creditLimitMultiplier?: number
        weights?: {
            guarantors?: number
            income?: number
            residence?: number
            identity?: number
        }
    }
    salesTerms?: {
        minInvoiceAmount?: number
        downPaymentLogic?: {
            monthly?: string
        }
    }
    legalPolicy?: {
        thresholds?: { daily?: number; monthly?: number }
        banPeriodDays?: number
        warningInterval?: number
    }
    inventory?: {
        globalMinStock?: number
    }
}

interface SystemLog {
    id?: string
    timestamp: string
    action: string
    details: string
}

const TABS = [
    { id: 'branding', label: 'هوية المؤسسة', icon: '🎨' },
    { id: 'credit', label: 'شروط الائتمان', icon: '🛡️' },
    { id: 'sales', label: 'ضوابط البيع', icon: '💰' },
    { id: 'legal', label: 'الشؤون القانونية', icon: '⚖️' },
    { id: 'inventory', label: 'المخازن والتنبيهات', icon: '📦' },
    { id: 'advanced', label: 'إعدادات النظام', icon: '💻', ownerOnly: true },
]

export default function SettingsPage({ currentUser }: SettingsProps) {
    const [activeTab, setActiveTab] = useState('branding')
    const [isProcessing, setIsProcessing] = useState(false)
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>([])
    const [config, setConfig] = useState<ConfigData>({})
    const [isLoading, setIsLoading] = useState(true)

    // FIX: Declare loadConfig BEFORE useEffect using useCallback
    const loadConfig = useCallback(async () => {
        try {
            const data = await settingsAPI.get();
            if (data?.data) {
                setConfig(data.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // FIX: useEffect calls loadConfig after it's declared
    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // FIX: All hooks must be called before any conditional returns
    const allowedTabs = useMemo(() => {
        if (currentUser?.role === 'OWNER') return TABS
        return TABS.filter(t => !t.ownerOnly)
    }, [currentUser?.role]);

    // FIX: Remove setState from useEffect body
    useEffect(() => {
        if (activeTab === 'advanced') {
            // TODO: Fetch actual system logs from backend
            // For now, just clear logs when switching to advanced tab
            setSystemLogs([]);
        }
    }, [activeTab]);

    // FIX: Role guard AFTER all hooks
    if (currentUser?.role !== 'OWNER' && currentUser?.role !== 'MODERATOR' && currentUser?.role !== 'Admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6" dir="rtl">
                <div className="bg-red-50 border border-red-100 rounded-xl p-8 max-w-md w-full text-center shadow-sm">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">وصول مرفوض</h2>
                    <p className="text-sm text-red-600">هذه اللوحة سيادية، مصرح للإدارة العليا فقط بالدخول إليها وتعديل إعدادات البيزنس.</p>
                </div>
            </div>
        )
    }

    const updateSection = (section: keyof ConfigData, key: string, value: string | number) => {
        setConfig(prev => ({
            ...prev,
            [section]: { ...(prev[section] || {}), [key]: value }
        }))
    }

    const updateNested = (section: keyof ConfigData, subSection: string, key: string, value: string | number) => {
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [subSection]: { ...((prev[section] as Record<string, any>)?.[subSection] || {}), [key]: value }
            }
        }))
    }

    const saveConfig = async () => {
        setIsProcessing(true)
        try {
            await settingsAPI.update(config);
            alert("✅ تم حفظ وتحديث الإعدادات بنجاح!")
        } catch (err) {
            console.error('Save error:', err);
            alert("❌ حدث خطأ أثناء الحفظ.");
        } finally {
            setIsProcessing(false)
        }
    }

    const clearSystemCache = () => {
        if (confirm("⚠️ تفريغ الكاش سيؤدي إلى إعادة تحميل الصفحة. هل ترغب بالاستمرار؟")) {
            localStorage.removeItem('ecofine_last_activity');
            location.reload()
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">جاري تحميل الإعدادات...</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto font-sans" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <SettingsIcon className="text-blue-600" />
                        إعدادات النظام والسياسات
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">التحكم المركزي في قواعد وشروط بيئة العمل والمؤسسة</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto">
                    {allowedTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-6 flex items-center justify-center gap-2 transition-all min-w-[150px] font-medium text-sm border-b-2 ${activeTab === tab.id ? 'bg-white border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 space-y-8">
                    {activeTab === 'branding' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">الهوية البصرية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField label="اسم المؤسسة" value={config.identity?.storeName || ''} onChange={(v: string) => updateSection('identity', 'storeName', v)} />
                                <InputField label="العملة المعتمدة" value={config.identity?.currency || ''} onChange={(v: string) => updateSection('identity', 'currency', v)} />
                                <InputField label="لون السمة (HEX Code)" value={config.identity?.themeColor || ''} onChange={(v: string) => updateSection('identity', 'themeColor', v)} dir="ltr" />
                            </div>
                            <SaveButton isProcessing={isProcessing} onClick={saveConfig} />
                        </div>
                    )}

                    {activeTab === 'credit' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">ضوابط الائتمان الأساسية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField type="number" label="الحد الأدنى لتقييم الائتمان (Score)" value={config.creditPolicy?.minScoreToEntry || 50} onChange={(v: string) => updateSection('creditPolicy', 'minScoreToEntry', Number(v))} />
                                <InputField type="number" label="معامل مضاعف سقف الائتمان" value={config.creditPolicy?.creditLimitMultiplier || 5} onChange={(v: string) => updateSection('creditPolicy', 'creditLimitMultiplier', Number(v))} />
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-700 mb-4">أوزان التقييم المالي (الإجمالي 100)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                                    <InputField type="number" label="وزن الضامنين" value={config.creditPolicy?.weights?.guarantors || 40} onChange={(v: string) => updateNested('creditPolicy', 'weights', 'guarantors', Number(v))} />
                                    <InputField type="number" label="وزن الدخل" value={config.creditPolicy?.weights?.income || 30} onChange={(v: string) => updateNested('creditPolicy', 'weights', 'income', Number(v))} />
                                    <InputField type="number" label="وزن السكن" value={config.creditPolicy?.weights?.residence || 20} onChange={(v: string) => updateNested('creditPolicy', 'weights', 'residence', Number(v))} />
                                    <InputField type="number" label="وزن الهوية" value={config.creditPolicy?.weights?.identity || 10} onChange={(v: string) => updateNested('creditPolicy', 'weights', 'identity', Number(v))} />
                                </div>
                            </div>
                            <SaveButton isProcessing={isProcessing} onClick={saveConfig} />
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">شروط وضوابط عمليات البيع</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField type="number" label="أقل مبلغ مسموح لفتح التقسيط (ج.م)" value={config.salesTerms?.minInvoiceAmount || 2500} onChange={(v: string) => updateSection('salesTerms', 'minInvoiceAmount', Number(v))} />
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">منطق تحصيل الدفعة المقدمة</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                                        value={config.salesTerms?.downPaymentLogic?.monthly || 'ONE_MONTH_PREPAID'}
                                        onChange={(e) => updateNested('salesTerms', 'downPaymentLogic', 'monthly', e.target.value)}
                                    >
                                        <option value="ONE_MONTH_PREPAID">قسط شهر مقدم كحد أدنى</option>
                                        <option value="PERCENTAGE">نسبة مئوية ثابتة</option>
                                        <option value="FLEXIBLE">نظام مرن (حسب المدخلات)</option>
                                    </select>
                                </div>
                            </div>
                            <SaveButton isProcessing={isProcessing} onClick={saveConfig} />
                        </div>
                    )}

                    {activeTab === 'legal' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">السياسات والحدود القانونية</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField type="number" label="حد التحويل لشؤون قانونية (بالأيام)" value={config.legalPolicy?.thresholds?.daily || 35} onChange={(v: string) => updateNested('legalPolicy', 'thresholds', 'daily', Number(v))} />
                                <InputField type="number" label="حد التحويل المتقدم (متابعة شهرية)" value={config.legalPolicy?.thresholds?.monthly || 63} onChange={(v: string) => updateNested('legalPolicy', 'thresholds', 'monthly', Number(v))} />
                                <InputField type="number" label="فترة حظر العميل المتعثر (بالأيام)" value={config.legalPolicy?.banPeriodDays || 180} onChange={(v: string) => updateSection('legalPolicy', 'banPeriodDays', Number(v))} />
                                <InputField type="number" label="الفاصل الزمني لرسائل الإنذار (أيام)" value={config.legalPolicy?.warningInterval || 10} onChange={(v: string) => updateSection('legalPolicy', 'warningInterval', Number(v))} />
                            </div>
                            <SaveButton isProcessing={isProcessing} onClick={saveConfig} />
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="space-y-6 animate-in fade-in">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">إعدادات المخزون والتنبيهات</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField type="number" label="حد التنبيه العام لنواقص المخزون (بالقطعة)" value={config.inventory?.globalMinStock || 3} onChange={(v: string) => updateSection('inventory', 'globalMinStock', Number(v))} />
                            </div>
                            <SaveButton isProcessing={isProcessing} onClick={saveConfig} />
                        </div>
                    )}

                    {activeTab === 'advanced' && currentUser.role === 'OWNER' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col justify-center">
                                    <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                                        <AlertTriangle size={20} className="text-red-600"/>
                                        منطقة الخطر (Danger Zone)
                                    </h3>
                                    <p className="text-sm text-red-600 mb-4">سيؤدي هذا الإجراء إلى مسح ملفات الارتباط المؤقتة للنظام وإعادة تحميل الصفحة بالقوة.</p>
                                    <button onClick={clearSystemCache} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2">
                                        <HardDrive size={16} />
                                        تفريغ الكاش المحلي (Clear Cache)
                                    </button>
                                </div>

                                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-64 flex flex-col">
                                    <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                                        <Bug size={18} className="text-gray-400" />
                                        سجل الأخطاء الحرج
                                    </h3>
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scroll space-y-3">
                                        {systemLogs.length > 0 ? systemLogs.map((log, i) => (
                                            <div key={log.id || i} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                                                <p className="text-[11px] text-red-400 font-mono mb-1" dir="ltr">[{new Date(log.timestamp).toLocaleTimeString()}] {log.action}</p>
                                                <p className="text-xs text-gray-400">{log.details}</p>
                                            </div>
                                        )) : (
                                            <div className="h-full flex items-center justify-center text-sm text-emerald-400 font-mono">
                                                All systems operational. 🟢
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Helper components
interface InputFieldProps {
    label: string
    value: string | number
    onChange: (value: string) => void
    type?: string
    dir?: string
}

const InputField = ({ label, value, onChange, type = "text", dir = "rtl" }: InputFieldProps) => (
    <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">{label}</label>
        <input
            type={type}
            value={value}
            dir={dir}
            onChange={e => onChange(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
    </div>
)

interface SaveButtonProps {
    onClick: () => void
    isProcessing: boolean
}

const SaveButton = ({ onClick, isProcessing }: SaveButtonProps) => (
    <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end">
        <button
            onClick={onClick}
            disabled={isProcessing}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
            {isProcessing ? 'جاري الحفظ والمزامنة...' : 'حفظ الإعدادات'}
        </button>
    </div>
)