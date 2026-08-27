import React, { useMemo } from 'react';
import { ArrowUpRight, Bell, CircleDollarSign, Coins, Sparkles, WalletCards } from 'lucide-react';
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

  const metrics = useMemo(() => {
    return computeDashboardMetrics(activeEntity, assets, liabilities, transactions);
  }, [activeEntity, assets, liabilities, transactions]);

  const quickActions = [
    { label: 'إيراد', icon: CircleDollarSign, tone: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'مصروف', icon: Coins, tone: 'bg-amber-500/10 text-amber-600' },
    { label: 'تحويل', icon: ArrowUpRight, tone: 'bg-violet-500/10 text-violet-600' },
    { label: 'محفظة', icon: WalletCards, tone: 'bg-sky-500/10 text-sky-600' }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_26%),linear-gradient(180deg,#f8fbff_0%,#edf3ff_100%)] pb-28">
      <TopNav />

      <main className="flex flex-col gap-4 px-4 pb-6 pt-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">CoreBalance</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">لوحة التحكم</h1>
          </div>

          <button
            type="button"
            aria-label="الإشعارات"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-transform active:scale-95"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
        </header>

        <NetWorthCard metrics={metrics} />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-slate-100 bg-white/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">الأصول السائلة</p>
            <p className="mt-3 text-xl font-black text-slate-900">{metrics.liquid_assets.toLocaleString('en-US')}</p>
            <p className="mt-1 text-[11px] text-emerald-600">+12.4% هذا الشهر</p>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-white/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">نسبة الديون</p>
            <p className="mt-3 text-xl font-black text-slate-900">{metrics.debt_ratio}%</p>
            <p className="mt-1 text-[11px] text-sky-600">مستوى جيد</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-100 bg-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">إجراءات سريعة</h2>
            <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">مباشرة</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {quickActions.map(({ label, icon: Icon, tone }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center justify-center gap-2 rounded-[20px] border border-slate-100 bg-slate-50 p-3 transition-all duration-200 active:scale-[0.98]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon size={18} />
                </span>
                <span className="text-[11px] font-bold text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <RunwayWidget metrics={metrics} />

        <section className="rounded-[28px] border border-slate-100 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">الأداء</p>
              <h2 className="mt-1 text-sm font-black text-slate-900">توزيع النشاط</h2>
            </div>
            <Sparkles size={16} className="text-violet-500" />
          </div>

          <div className="space-y-3">
            {[
              { label: 'دخل النظام', value: metrics.system_income_percent, color: 'bg-violet-500', bar: 'w-[72%]' },
              { label: 'الأصول', value: 78, color: 'bg-emerald-500', bar: 'w-[78%]' },
              { label: 'التحصيل', value: 64, color: 'bg-sky-500', bar: 'w-[64%]' }
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${item.color} ${item.bar}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <RecentTxList transactions={transactions} />
      </main>
    </div>
  );
};