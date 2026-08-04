import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DebtForm } from '../forms/DebtForm';
import { PlusCircle, CreditCard, AlertCircle } from 'lucide-react';

export const DebtPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debts, setDebts] = useState<Array<{ id: string; title: string; amount: number; dueDate: string }>>([]);

  const handleAddDebt = (data: { title: string; amount: number; dueDate: string }) => {
    setDebts([...debts, { ...data, id: Date.now().toString() }]);
    setIsModalOpen(false);
  };

  const totalDebt = debts.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-center justify-between">
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          إضافة التزام جديد
        </Button>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-rose-400" />
          إدارة الديون والالتزامات
        </h2>
      </div>

      <Card className="p-5 bg-gradient-to-r from-rose-950/30 to-slate-900 border-rose-900/40">
        <span className="text-sm text-slate-400">إجمالي الالتزامات القائمة</span>
        <div className="text-3xl font-black text-rose-400 mt-1">
          {totalDebt.toLocaleString()} EGP
        </div>
      </Card>

      <div className="space-y-3">
        {debts.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-500" />
            <p>لا توجد ديون أو التزامات مسجلة حالياً.</p>
          </Card>
        ) : (
          debts.map((debt) => (
            <Card key={debt.id} className="p-4 flex items-center justify-between">
              <span className="font-bold text-rose-400">{debt.amount.toLocaleString()} EGP</span>
              <div>
                <h4 className="font-semibold text-slate-200">{debt.title}</h4>
                {debt.dueDate && <span className="text-xs text-slate-400">استحقاق: {debt.dueDate}</span>}
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة التزام / دين">
        <DebtForm onSubmit={handleAddDebt} onCancel={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};