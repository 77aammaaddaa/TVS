import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DebtFormProps {
  onSubmit: (data: { title: string; amount: number; dueDate: string }) => void;
  onCancel: () => void;
}

export const DebtForm: React.FC<DebtFormProps> = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;
    onSubmit({ title, amount: Number(amount), dueDate });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">بيان الدين / الالتزام</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: أقساط / مستحقات موردين"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">المبلغ (EGP)</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">تاريخ الاستحقاق</label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1">إضافة الالتزام</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
      </div>
    </form>
  );
};