import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAssets } from '@/hooks/useAssets';
import { TopNav } from '@/components/layout/TopNav';
import { Wallet, MonitorSmartphone, BrainCircuit, Globe } from 'lucide-react';
import { ValuationMethod } from '@/types';

export const AssetPage: React.FC = () => {
  const { assets } = useAssets();
  
  const liquidAssets = assets.filter(a => a.asset_type === 'متداول');
  const nonLiquidAssets = assets.filter(a => a.asset_type === 'غير متداول');

  const getMethodIcon = (method: ValuationMethod) => {
    switch (method) {
      case 'Hardware': return <MonitorSmartphone size={18} />;
      case 'Knowledge': return <BrainCircuit size={18} />;
      case 'Digital': return <Globe size={18} />;
      default: return <Wallet size={18} />;
    }
  };

  const AssetGroup = ({ title, data }: { title: string, data: typeof assets }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-slate-500 mb-3 ml-1">{title}</h3>
      <div className="grid grid-cols-1 gap-3">
        {data.map(asset => (
          <div key={asset.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 p-3 rounded-xl text-slate-700">
                {getMethodIcon(asset.valuation_method)}
              </div>
              <div>
                <p className="font-bold text-slate-800">{asset.name}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{asset.valuation_method} • {asset.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-slate-900">{asset.current_value.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600 font-bold">مُحدث SVE</p>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-slate-400 ml-1">لا توجد أصول مسجلة هنا.</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <TopNav />
      <div className="p-4">
        <AssetGroup title="الخزائن والسيولة المتداولة" data={liquidAssets} />
        <AssetGroup title="الأصول الصلبة، المعرفية والرقمية" data={nonLiquidAssets} />
      </div>
    </div>
  );
};