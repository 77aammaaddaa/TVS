import React from 'react';
import { Transaction } from '@/types';
import { ArrowDownRight, ArrowUpRight, RefreshCcw } from 'lucide-react';

interface RecentTxListProps {
  transactions: Transaction[];
}

export const RecentTxList: React.FC<RecentTxListProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return <div className="text-center text-slate-500 text-sm py-6">لا توجد حركات حديثة</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
      <div className="px-3 pt-3 pb-2 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-800">آخر الحركات</h3>
        <button className="text-xs text-indigo-600 font-bold">الكل</button>
      </div>
      
      <div className="flex flex-col">
        {transactions.slice(0, 5).map((tx, idx) => (
          <div key={tx.id || idx} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0 active:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                tx.type === 'إيراد' ? 'bg-emerald-50 text-emerald-600' : 
                tx.type === 'مصروف' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {tx.type === 'إيراد' && <ArrowDownRight size={18} />}
                {tx.type === 'مصروف' && <ArrowUpRight size={18} />}
                {tx.type === 'تحويل داخلي' && <RefreshCcw size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{tx.category}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{tx.trans_date}</p>
              </div>
            </div>
            <p className={`text-sm font-bold ${tx.type === 'مصروف' ? 'text-slate-800' : 'text-emerald-600'}`}>
              {tx.type === 'مصروف' ? '-' : '+'}{tx.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};