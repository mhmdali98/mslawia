import { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

// Styled <select> with the chevron affordance.
export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`input appearance-none cursor-pointer ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
    </div>
  );
}
