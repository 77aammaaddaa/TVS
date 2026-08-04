import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAssets } from '@/hooks/useAssets';
import { useLiabilities } from '@/hooks/useLiabilities';
import { useTx } from '@/hooks/useTx';
import { TransType, Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const QuickTxForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { activeEntity } = useAppStore();
  const { assets } = useAssets();
  const { urgentLiabilities } = useLiabilities();
  const { executeTransaction } = useTx();

  // الحالة المحلية للنموذج
  const [type, setType] = useState<TransType>('مصروف');
  const [amount, setAmount] = useState<string>('');
  const [assetUsed, setAssetUsed] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [liabilityId, setLiabilityId] = useState<string>('');

  // تصفية الأصول لتقتصر على الخزائن المتداولة للكيان الحالي فقط لمنع الخلط المالي
  const liquidAssets = assets.filter(a => a.asset_type === 'متداول');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !assetUsed || !category) return;

    const tx: Transaction = {
      amount: parseFloat(amount),
      asset_used: assetUsed,
      category,
      entity_id: activeEntity,
      type,
      liability_id: liabilityId || undefined,
      trans_date: new Date().toISOString().split('T')[0],
    };

    const res = await executeTransaction(tx);
    if (res.success) {
      if (onSuccess) onSuccess();
      // تصفير النموذج
      setAmount('');
      setCategory('');
      setLiabilityId('');
    } else {
      alert(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* مبدل نوع الحركة */}
      <div className="flex bg-slate-100 p-1 rounded-xl">
        {(['مصروف', 'إيراد', 'تحويل داخلي'] as TransType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              type === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Input
        label="المبلغ"
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        required
      />

      <div className="flex flex-col w-full">
        <label className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">الخزنة / الأصل</label>
        <select 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={assetUsed}
          onChange={(e) => setAssetUsed(e.target.value)}
          required
        >
          <option value="" disabled>اختر الأصل السائل...</option>
          {liquidAssets.map(a => (
            <option key={a.id} value={a.id}>{a.name} (الرصيد: {a.current_value})</option>
          ))}
        </select>
      </div>

      <Input
        label="التصنيف / البند"
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="مثال: مطاعم، راتب، تسويق..."
        required
      />

      {type === 'مصروف' && urgentLiabilities.length > 0 && (
        <div className="flex flex-col w-full bg-red-50 p-3 rounded-xl border border-red-100">
          <label className="text-sm font-semibold text-red-800 mb-1.5 ml-1">ربط بدَيْن أو التزام (سداد تلقائي)</label>
          <select 
            className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={liabilityId}
            onChange={(e) => setLiabilityId(e.target.value)}
          >
            <option value="">بدون ربط (مصروف عادي)</option>
            {urgentLiabilities.map(l => (
              <option key={l.id} value={l.id}>{l.creditor} (متبقي: {l.remaining_balance})</option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" fullWidth className="mt-2 text-lg">
        تأكيد وحفظ
      </Button>
    </form>
  );
};