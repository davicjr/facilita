'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminEntityCardProps = {
  cover?: ReactNode;
  coverOverlay?: ReactNode;
  cornerBadge?: ReactNode;
  details: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  onOpen?: () => void;
  className?: string;
  coverClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  dividerColor?: string;
  hideCover?: boolean;
  hoverClassName?: string;
};

export default function AdminEntityCard({
  cover,
  coverOverlay,
  cornerBadge,
  details,
  trailing,
  footer,
  onOpen,
  className,
  coverClassName,
  contentClassName,
  footerClassName,
  dividerColor,
  hideCover = false,
  hoverClassName = 'hover:-translate-y-1.5 hover:scale-[1.025] hover:shadow-[0_22px_38px_rgba(15,22,26,0.18)]',
}: AdminEntityCardProps) {
  const isInteractive = Boolean(onOpen);
  const coverMotionClassName =
    'h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:scale-[1.045]';

  return (
    <article
      className={cn(
        'fac-card group/entity-card relative isolate w-[220px] max-w-full transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        hoverClassName,
        className,
      )}
    >
      {cornerBadge ? <div className="absolute right-3 top-3 z-10">{cornerBadge}</div> : null}

      {!hideCover ? (
        <div className={cn('relative h-40 w-full overflow-hidden', coverClassName)}>
          {isInteractive ? (
            <button
              type="button"
              className="block h-full w-full border-0 bg-muted p-0 text-left align-top"
              onClick={onOpen}
            >
              <div className={coverMotionClassName}>{cover}</div>
            </button>
          ) : (
            <div className="h-full w-full bg-muted">
              <div className={coverMotionClassName}>{cover}</div>
            </div>
          )}

          {coverOverlay ? (
            <div className="absolute right-2 top-2 z-10">{coverOverlay}</div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'relative flex flex-col gap-2 bg-white/92 px-3 py-2 transition-[background,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:translate-y-[-1px]',
          hideCover ? '' : 'border-t border-border',
          contentClassName,
        )}
        style={
          !hideCover && dividerColor
            ? {
                borderTopColor: dividerColor,
                borderTopWidth: 3,
                background: `linear-gradient(180deg, color-mix(in srgb, ${dividerColor} 16%, var(--card) 84%) 0%, color-mix(in srgb, ${dividerColor} 8%, var(--card) 92%) 100%)`,
              }
            : undefined
        }
      >
        {isInteractive ? (
          <button
            type="button"
            className="w-full text-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:translate-x-0.5"
            onClick={onOpen}
          >
            {details}
          </button>
        ) : (
          <div className="w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:translate-x-0.5">
            {details}
          </div>
        )}

        {trailing ? (
          <div className="flex items-center justify-end gap-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:-translate-y-0.5">
            {trailing}
          </div>
        ) : null}
      </div>

      {footer ? (
        <div
          className={cn(
            'border-t border-border bg-white/92 px-3 py-3 transition-[background,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:translate-y-[-1px]',
            footerClassName,
          )}
          style={
            dividerColor
              ? {
                  borderTopColor: `color-mix(in srgb, ${dividerColor} 28%, var(--border) 72%)`,
                  background: `linear-gradient(180deg, color-mix(in srgb, ${dividerColor} 12%, var(--card) 88%) 0%, color-mix(in srgb, ${dividerColor} 6%, var(--card) 94%) 100%)`,
                }
            : undefined
          }
        >
          <div className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/entity-card:translate-x-0.5">
            {footer}
          </div>
        </div>
      ) : null}
    </article>
  );
}
