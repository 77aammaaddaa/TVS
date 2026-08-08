import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col w-full mb-4">
      {label && (
        <label className="text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-slate-50 border ${error ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'}
        rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent
        transition-all text-base touch-manipulation ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1.5 ml-1 font-medium">{error}</span>}
    </div>
  );
};