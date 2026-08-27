import React from 'react';
import { Home, ArrowRightLeft, Wallet, CreditCard, Plus } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'dashboard' | 'transactions' | 'assets' | 'liabilities';
  onChangeTab: (tab: 'dashboard' | 'transactions' | 'assets' | 'liabilities') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChangeTab }) => {
  const navItems = [
    { id: 'dashboard' as const, icon: Home, label: 'الرئيسية' },
    { id: 'transactions' as const, icon: ArrowRightLeft, label: 'الحركات' },
    { id: 'fab' as const, icon: Plus, label: '' },
    { id: 'assets' as const, icon: Wallet, label: 'الأصول' },
    { id: 'liabilities' as const, icon: CreditCard, label: 'الخصوم' },
  ];

  return (
    <>
      <div className="fixed bottom-7 left-1/2 z-50 -translate-x-1/2">
        <button
          type="button"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 text-white shadow-[0_18px_32px_rgba(79,70,229,0.42)] transition-all duration-200 active:scale-95 touch-manipulation"
          onClick={() => onChangeTab('transactions')}
          aria-label="إضافة حركة جديدة"
        >
          <Plus size={30} strokeWidth={2.5} />
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/80 px-2 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[440px] items-center justify-between gap-1 rounded-t-[24px] px-1">
          {navItems.map((item) => {
            if (item.id === 'fab') {
              return <div key={item.id} className="w-16" />;
            }

            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-2 py-2 transition-all duration-200 active:scale-95 touch-manipulation ${
                  isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};