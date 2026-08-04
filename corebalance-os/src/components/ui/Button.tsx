import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'fab';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 touch-manipulation select-none';
  
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-5 py-3 shadow-sm',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-xl px-5 py-3',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 rounded-xl px-5 py-3',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 rounded-xl px-4 py-2',
    fab: 'bg-indigo-600 text-white rounded-full p-4 shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};