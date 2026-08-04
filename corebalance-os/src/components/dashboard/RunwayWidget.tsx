import React from 'react';
import { Card } from '@/components/ui/Card';
import { DashboardMetrics } from '@/types';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface RunwayWidgetProps {
  metrics: DashboardMetrics;
}

export const RunwayWidget: React.FC<RunwayWidgetProps> = ({ metrics }) => {
  // دلالات الألوان للـ Runway (أكثر من 6 شهور = آمن، أقل من 3 = خطر)
  const isRunwaySafe = metrics.runway_index >= 6;
  const isRunwayWarning = metrics.runway_index < 6 && metrics.runway_index >= 3;

  // دلالات الألوان للديون (أقل من 30% = آمن، أكثر من 60% = خطر)
  const isDebtSafe = metrics.debt_ratio <= 30;
  
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card className="flex flex-col justify-center items-center p-4 text-center">
        {isRunwaySafe ? (
          <ShieldCheck size={28} className="text-emerald-500 mb-2" />
        ) : (
          <AlertTriangle size={28} className={isRunwayWarning ? 'text-amber-500 mb-2' : 'text-red-500 mb-2'} />
        )}
        <h3 className="text-xl font-bold text-slate-800">
          {metrics.runway_index > 100 ? 'أمان تام' : `${metrics.runway_index} شهر`}
        </h3>
        <p className="text-xs text-slate-500 font-semibold mt-1">مؤشر الصمود (Runway)</p>
      </Card>

      <Card className="flex flex-col justify-center items-center p-4 text-center">
        <div className="relative w-12 h-12 flex items-center justify-center mb-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path 
              className={isDebtSafe ? 'text-blue-500' : 'text-red-500'} 
              strokeDasharray={`${metrics.debt_ratio}, 100`} 
              strokeWidth="3" stroke="currentColor" fill="none" 
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-slate-700">{metrics.debt_ratio}%</span>
        </div>
        <h3 className="text-sm font-bold text-slate-800">التعرض للديون</h3>
      </Card>
    </div>
  );
};