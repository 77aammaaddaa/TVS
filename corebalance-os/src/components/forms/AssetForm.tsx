import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AssetFormProps {
  onSubmit: (data: { name: string; value: number; category: string }) => void;
  onCancel: () => void;
}

export const AssetForm: React.FC<AssetFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('cash');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;
    onSubmit({ name, value: Number(value), category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">اسم الأصل</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: حساب بنكي / ذهب / بضاعة"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">القيمة (EGP)</label>
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">التصنيف</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
        >
          <option value="cash">سيولة / كاش</option>
          <option value="investment">استثمار</option>
          <option value="business">أصول عمل</option>
          <option value="real_estate">عقارات</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">حفظ الأصل</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
      </div>
    </form>
  );
};