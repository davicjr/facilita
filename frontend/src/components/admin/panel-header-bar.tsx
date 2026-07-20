'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminPanelHeaderBarProps = {
  title: string;
  count: number | string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  countClassName?: string;
  actionsClassName?: string;
};

export default function AdminPanelHeaderBar({
  title,
  count,
  actions,
  className,
  titleClassName,
  countClassName,
  actionsClassName,
}: AdminPanelHeaderBarProps) {
  return (
    <div className={cn('fac-panel-head gap-3 !items-center max-lg:flex-wrap', className)}>
      <div className="flex items-center gap-3">
        <h1
          className={cn('fac-nav-brand-wordmark !text-[22px] !font-normal', titleClassName)}
          style={{ textTransform: 'none' }}
        >
          {title}
        </h1>
        <div
          className={cn(
            'flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/60 bg-primary px-2 text-[12px] font-medium text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.18)]',
            countClassName,
          )}
        >
          {count}
        </div>
      </div>

      {actions ? (
        <div className={cn('grid w-full gap-2 lg:ml-auto lg:w-auto', actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
