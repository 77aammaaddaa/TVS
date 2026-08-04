import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import { PlanType } from '@/types/admin';
import { ShieldAlert, Key, Smartphone, Copy, PowerOff, CheckCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const SuperAdmin: React.FC = () => {
  const { licenses, generateLicense, suspendLicense, unbindDevice } = useAdminStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('LIFETIME');
  const [searchTerm, setSearchTerm] = useState('');

  const activeCount = licenses.filter(l => l.status === 'ACTIVE').length;
  const filteredLicenses = licenses.filter(l => l.license_key.includes(searchTerm.toUpperCase()));

  const handleGenerate = () => {
    generateLicense(selectedPlan, 'Generated via Admin Dashboard');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ كود التفعيل!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <ShieldAlert className="text-indigo-500" size={32} />
            TVS CoreBalance
          </h1>
          <p className="text-slate-500 mt-1 font-semibold tracking-widest uppercase text-sm">Central Command Center</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex gap-6 shadow-inner">
          <div className="text-center">
            <p className="text-xs text-slate-500 font-bold mb-1">الرخص النشطة</p>
            <p className="text-xl text-emerald-400 font-black">{activeCount}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 font-bold mb-1">إجمالي التراخيص</p>
            <p className="text-xl text-white font-black">{licenses.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Key Generator Widget */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Key className="text-emerald-500" />
            توليد ترخيص جديد
          </h2>
          
          <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
            {(['LIFETIME', 'ANNUAL', 'TRIAL'] as PlanType[]).map((plan) => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${
                  selectedPlan === plan ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {plan}
              </button>
            ))}
          </div>

          <Button onClick={handleGenerate} fullWidth className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-lg font-bold shadow-lg shadow-emerald-900/20">
            إنشاء كود التفعيل
          </Button>
        </div>

        {/* Licenses Data Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">إدارة التراخيص والمستخدمين</h2>
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="ابحث بكود التفعيل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-4 pr-10 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold text-right">كود التفعيل</th>
                  <th className="p-4 font-semibold">الباقة</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold">الجهاز المرتبط</th>
                  <th className="p-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLicenses.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-600">لا توجد تراخيص مسجلة حتى الآن</td></tr>
                ) : (
                  filteredLicenses.map((lic) => (
                    <tr key={lic.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <code className="bg-slate-950 text-indigo-300 px-3 py-1.5 rounded-lg font-mono font-bold tracking-widest">{lic.license_key}</code>
                          <button onClick={() => copyToClipboard(lic.license_key)} className="text-slate-500 hover:text-white transition-colors p-1">
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-400">{lic.plan_type}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          lic.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {lic.status === 'ACTIVE' ? <CheckCircle size={14} /> : <PowerOff size={14} />}
                          {lic.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {lic.device_id ? (
                          <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 w-fit px-2 py-1 rounded-md">
                            <Smartphone size={12} /> {lic.device_id.substring(0, 8)}...
                          </span>
                        ) : 'غير مرتبط'}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => unbindDevice(lic.id)}
                            disabled={!lic.device_id}
                            title="فك ارتباط الجهاز"
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-all"
                          >
                            <Smartphone size={16} />
                          </button>
                          <button 
                            onClick={() => suspendLicense(lic.id)}
                            title={lic.status === 'ACTIVE' ? 'إيقاف الترخيص' : 'تفعيل الترخيص'}
                            className={`p-2 rounded-lg transition-all ${
                              lic.status === 'ACTIVE' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            <PowerOff size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};