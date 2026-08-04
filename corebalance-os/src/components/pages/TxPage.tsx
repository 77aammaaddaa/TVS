import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTx } from '@/hooks/useTx';
import { TopNav } from '@/components/layout/TopNav';
import { ArrowDownRight, ArrowUpRight, RefreshCcw, Filter } from 'lucide-react';
import { TransType } from '@/types';

export const TxPage: React.FC = () => {
  const { activeEntity } = useAppStore();
  const { transactions } = useTx();
  const [filter, setFilter] = useState<TransType | 'الكل'>('الكل');

  const filteredTx = transactions.filter(tx => filter === 'الكل' || tx.type === filter);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <TopNav />
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">سجل العمليات</h2>
          <button className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 text-slate-600 active:scale-95">
            <Filter size={20} />
          </button>
        </div>

        {/* فلاتر سريعة */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 touch-manipulation">
          {(['الكل', 'إيراد', 'مصروف', 'تحويل داخلي'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                filter === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* القائمة */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          {filteredTx.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium">لا توجد حركات مطابقة</div>
          ) : (
            filteredTx.map((tx, idx) => (
              <div key={tx.id || idx} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    tx.type === 'إيراد' ? 'bg-emerald-50 text-emerald-600' : 
                    tx.type === 'مصروف' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {tx.type === 'إيراد' && <ArrowDownRight size={20} />}
                    {tx.type === 'مصروف' && <ArrowUpRight size={20} />}
                    {tx.type === 'تحويل داخلي' && <RefreshCcw size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{tx.category}</p>
                    <p className="text-xs text-slate-500 mt-1 flex gap-2">
                      <span>{tx.trans_date}</span>
                      <span className="text-slate-300">•</span>
                      <span>{tx.asset_name || tx.asset_used}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-bold ${tx.type === 'مصروف' ? 'text-slate-800' : 'text-emerald-600'}`}>
                    {tx.type === 'مصروف' ? '-' : '+'}{tx.amount.toLocaleString()}
                  </p>
                  {tx.liability_id && <p className="text-[10px] text-indigo-500 font-bold mt-1">سداد دَيْن</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};