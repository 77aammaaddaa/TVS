import React from 'react';
import { Home, ArrowRightLeft, Wallet, CreditCard, Plus } from 'lucide-react';

export const BottomNav: React.FC = () => {
  // مؤقتاً لغرض التصميم، سيتم ربطها بـ React Router لاحقاً
  const currentTab = 'dashboard'; 

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'الرئيسية' },
    { id: 'transactions', icon: ArrowRightLeft, label: 'الحركات' },
    { id: 'fab', icon: Plus, label: '' }, // عنصر وهمي لحجز مساحة للزر العائم
    { id: 'assets', icon: Wallet, label: 'الأصول' },
    { id: 'liabilities', icon: CreditCard, label: 'الخصوم' },
  ];

  return (
    <>
      {/* الزر العائم (FAB) للإدخال السريع - يتوسط الشاشة فوق الشريط */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button 
          className="bg-slate-900 text-white p-4 rounded-full shadow-xl shadow-slate-300 active:scale-90 transition-transform duration-200 touch-manipulation"
          onClick={() => console.log('Open Quick Tx Modal')}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {/* شريط التنقل السفلي */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe pt-2 px-2 z-40">
        <div className="flex justify-between items-center h-14">
          {navItems.map((item) => {
            if (item.id === 'fab') {
              return <div key={item.id} className="w-16" />; // مساحة فارغة للزر العائم
            }
            
            const isActive = currentTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
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