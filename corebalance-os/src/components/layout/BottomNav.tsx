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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          type="button"
          className="bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-300 active:scale-90 transition-transform duration-200 touch-manipulation"
          onClick={() => onChangeTab('transactions')}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 px-2 z-40">
        <div className="flex justify-between items-center h-14">
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
                className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform touch-manipulation"
              >
                <Icon
                  size={24}
                  className={`transition-colors duration-200 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[10px] font-bold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};