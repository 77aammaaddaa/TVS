import React from 'react';
import { Card } from '@/components/ui/Card';
import { DashboardMetrics } from '@/types';
import { TrendingUp, TrendingDown, Wallet, Box } from 'lucide-react';

interface NetWorthCardProps {
  metrics: DashboardMetrics;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({ metrics }) => {
  const isPositiveGrowth = metrics.growth_rate >= 0;

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none mb-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">صافي الثروة (Net Worth)</p>
          <h2 className="text-3xl font-bold tracking-tight">
            {metrics.net_worth.toLocaleString('en-US')} <span className="text-lg font-normal text-slate-400">EGP</span>
          </h2>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isPositiveGrowth ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {isPositiveGrowth ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(metrics.growth_rate)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg text-blue-400">
            <Wallet size={18} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">السيولة المتداولة</p>
            <p className="font-semibold text-sm">{metrics.liquid_assets.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2 rounded-lg text-purple-400">
            <Box size={18} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">الأنظمة والأصول</p>
            <p className="font-semibold text-sm">{metrics.ip_and_systems.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};