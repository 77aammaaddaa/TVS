import * as React from 'react';

export function Button({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-2xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-bold text-white ${className}`}
      {...props}
    />
  );
}
