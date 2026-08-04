import React, { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAssets } from '@/hooks/useAssets';
import { useLiabilities } from '@/hooks/useLiabilities';
import { useTx } from '@/hooks/useTx';
import { computeDashboardMetrics } from '@/logic/metrics';

import { TopNav } from '@/components/layout/TopNav';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { RunwayWidget } from '@/components/dashboard/RunwayWidget';
import { RecentTxList } from '@/components/dashboard/RecentTxList';

export const Dashboard: React.FC = () => {
  const { activeEntity } = useAppStore();
  const { assets } = useAssets();
  const { liabilities } = useLiabilities();
  const { transactions } = useTx();

  // حساب المؤشرات اللحظية كلما تغيرت الداتا أو الكيان النشط
  const metrics = useMemo(() => {
    return computeDashboardMetrics(activeEntity, assets, liabilities, transactions);
  }, [activeEntity, assets, liabilities, transactions]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* الشريط العلوي المحتوي على مبدل الكيانات */}
      <TopNav />
      
      {/* محتوى الداشبورد */}
      <main className="p-4 flex flex-col gap-2">
        <NetWorthCard metrics={metrics} />
        <RunwayWidget metrics={metrics} />
        <RecentTxList transactions={transactions} />
      </main>
    </div>
  );
};