import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ 
  children, 
  className = '',
  onClick 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 
      ${onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};