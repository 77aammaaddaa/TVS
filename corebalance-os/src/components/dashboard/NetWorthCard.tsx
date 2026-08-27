import React from 'react';
import { Card } from '@/components/ui/Card';
import { DashboardMetrics } from '@/types';
import { ArrowUpRight, TrendingUp, Wallet, Boxes } from 'lucide-react';

interface NetWorthCardProps {
  metrics: DashboardMetrics;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({ metrics }) => {
  const isPositiveGrowth = metrics.growth_rate >= 0;

  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-4 text-white shadow-[0_24px_45px_rgba(67,56,202,0.28)]">
      <div className="absolute left-4 top-4 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200">Net Worth</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {metrics.net_worth.toLocaleString('en-US')}
            </h2>
            <p className="mt-1 text-sm text-slate-300">جنيه / EGP</p>
          </div>

          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${isPositiveGrowth ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
            {isPositiveGrowth ? <TrendingUp size={14} /> : <ArrowUpRight size={14} className="rotate-90" />}
            <span>{Math.abs(metrics.growth_rate) || 12.4}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-300">
              <Wallet size={16} className="text-sky-300" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">السيولة</span>
            </div>
            <p className="text-base font-black">{metrics.liquid_assets.toLocaleString('en-US')}</p>
          </div>

          <div className="rounded-2xl bg-white/5 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-300">
              <Boxes size={16} className="text-violet-300" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">الأصول</span>
            </div>
            <p className="text-base font-black">{metrics.ip_and_systems.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};