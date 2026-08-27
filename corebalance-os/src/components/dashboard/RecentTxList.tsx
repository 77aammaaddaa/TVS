import React from 'react';
import { Transaction } from '@/types';
import { ArrowDownRight, ArrowUpRight, RefreshCcw } from 'lucide-react';

interface RecentTxListProps {
  transactions: Transaction[];
}

export const RecentTxList: React.FC<RecentTxListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
        لا توجد حركات حديثة
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white/90 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Transactions</p>
          <h3 className="mt-1 text-sm font-black text-slate-900">آخر الحركات</h3>
        </div>
        <button type="button" className="text-[11px] font-bold text-indigo-600">الكل</button>
      </div>

      <div className="flex flex-col gap-2">
        {transactions.slice(0, 5).map((tx, idx) => {
          const toneClass =
            tx.type === 'إيراد'
              ? 'bg-emerald-50 text-emerald-600'
              : tx.type === 'مصروف'
                ? 'bg-red-50 text-red-600'
                : 'bg-blue-50 text-blue-600';

          const amountClass = tx.type === 'مصروف' ? 'text-slate-800' : 'text-emerald-600';
          const amountPrefix = tx.type === 'مصروف' ? '-' : '+';

          return (
            <div key={tx.id || idx} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50/80 p-3 transition-colors active:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
                  {tx.type === 'إيراد' && <ArrowDownRight size={18} />}
                  {tx.type === 'مصروف' && <ArrowUpRight size={18} />}
                  {tx.type === 'تحويل داخلي' && <RefreshCcw size={18} />}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">{tx.category || 'حركة مالية'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{tx.trans_date}</p>
                </div>
              </div>

              <p className={`text-sm font-black ${amountClass}`}>
                {amountPrefix}{tx.amount.toLocaleString('en-US')}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};