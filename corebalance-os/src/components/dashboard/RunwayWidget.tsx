import React from 'react';
import { Card } from '@/components/ui/Card';
import { DashboardMetrics } from '@/types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface RunwayWidgetProps {
  metrics: DashboardMetrics;
}

export const RunwayWidget: React.FC<RunwayWidgetProps> = ({ metrics }) => {
  const isRunwaySafe = metrics.runway_index >= 6;
  const isRunwayWarning = metrics.runway_index < 6 && metrics.runway_index >= 3;
  const isDebtSafe = metrics.debt_ratio <= 30;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="flex flex-col items-start justify-between border border-slate-100 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Runway</span>
          {isRunwaySafe ? (
            <ShieldCheck size={16} className="text-emerald-500" />
          ) : (
            <AlertTriangle size={16} className={isRunwayWarning ? 'text-amber-500' : 'text-red-500'} />
          )}
        </div>

        <div className="mt-4">
          <h3 className="text-2xl font-black text-slate-900">
            {metrics.runway_index > 100 ? 'آمن' : `${metrics.runway_index}`}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">شهر</p>
        </div>
      </Card>

      <Card className="flex flex-col items-start justify-between border border-slate-100 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">الديون</span>

        <div className="relative mt-4 flex h-14 w-14 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={isDebtSafe ? '#3b82f6' : '#ef4444'}
              strokeWidth="3"
              strokeDasharray={`${metrics.debt_ratio}, 100`}
            />
          </svg>
          <span className="absolute text-[10px] font-black text-slate-700">{metrics.debt_ratio}%</span>
        </div>
      </Card>
    </div>
  );
};