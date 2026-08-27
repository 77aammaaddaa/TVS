import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'fab' | 'gradient' | 'glass';
  fullWidth?: boolean;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  type = 'button',
  glow = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 active:scale-[0.97] touch-manipulation select-none outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500';

  const variants = {
    primary: 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:from-slate-800 hover:to-slate-700 rounded-2xl px-6 py-4 shadow-lg shadow-slate-900/10',
    secondary: 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-900 hover:from-slate-200 hover:to-slate-100 rounded-2xl px-6 py-4 shadow-sm',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 rounded-2xl px-6 py-4 shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 rounded-xl px-4 py-3',
    fab: 'bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-white rounded-full p-6 shadow-2xl shadow-indigo-500/30 hover:shadow-3xl hover:shadow-indigo-500/40 active:scale-[0.95]',
    gradient: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl px-6 py-4 shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30',
    glass: 'bg-white/10 backdrop-blur-lg border border-white/20 text-slate-800 hover:bg-white/20 rounded-2xl px-6 py-4 shadow-md'
  };

  const widthStyle = fullWidth ? 'w-full' : '';
  const glowEffect = glow ? 'shadow-[0_8px_30px_rgb(99,102,241,0.3)] animate-pulse-slow' : '';

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${glowEffect} ${className}`}
      {...props}
    >
      {children}
      {props.disabled && (
        <Loader2 className="w-4 h-4 ml-2 animate-spin text-white/50" />
      )}
    </button>
  );
};