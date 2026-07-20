'use client';

import type { ReactNode } from 'react';

type AdminFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
};

export default function AdminField({
  label,
  htmlFor,
  hint,
  children,
}: AdminFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
