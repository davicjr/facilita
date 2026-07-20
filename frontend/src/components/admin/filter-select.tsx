'use client';

import { ChevronDown } from 'lucide-react';
import { type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AdminFilterSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export default function AdminFilterSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: AdminFilterSelectProps) {
  return (
    <div className={cn('group relative', wrapperClassName)}>
      <select
        {...props}
        className={cn(
          'fac-select appearance-none pr-10 transition-colors duration-200 group-hover:border-foreground/30',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 group-hover:animate-pulse group-hover:scale-110 group-hover:text-foreground" />
    </div>
  );
}
