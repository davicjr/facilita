'use client';

import type { ReactNode } from 'react';

type FilterDropdownProps = {
  label?: string;
  activeCount?: number;
  children: ReactNode;
};

export default function FilterDropdown({
  label = 'Filtros',
  activeCount = 0,
  children,
}: FilterDropdownProps) {
  return (
    <details className="relative w-full sm:w-auto">
      <summary className="motion-press list-none rounded-lg border border-border/70 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground transition hover:border-foreground/60 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="ml-2 rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] tracking-[0.2em] text-muted-foreground">
            {activeCount}
          </span>
        )}
      </summary>
      <div className="dropdown-panel absolute right-0 z-20 mt-2 w-64 max-w-[90vw] rounded-xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur">
        {children}
      </div>
    </details>
  );
}
