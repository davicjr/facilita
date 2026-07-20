'use client';

import { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type ContentTypeSurfaceProps = {
  accentColor: string;
  icon?: LucideIcon;
  children?: ReactNode;
};

export default function ContentTypeSurface({
  accentColor,
  icon: Icon,
  children,
}: ContentTypeSurfaceProps) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{
        background: `radial-gradient(circle at 50% 28%, color-mix(in srgb, ${accentColor} 18%, var(--popover) 82%) 0%, color-mix(in srgb, ${accentColor} 10%, var(--card) 90%) 42%, color-mix(in srgb, ${accentColor} 4%, var(--background) 96%) 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 h-14 w-32 rounded-full opacity-45 blur-3xl"
        style={{ backgroundColor: accentColor }}
      />

      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-[26px] shadow-[0_18px_40px_rgba(15,22,26,0.12)] backdrop-blur-xl"
        style={{
          border: `1px solid color-mix(in srgb, ${accentColor} 20%, var(--border) 80%)`,
          background: 'color-mix(in srgb, var(--popover) 88%, transparent)',
        }}
      >
        {children ? (
          children
        ) : Icon ? (
          <Icon
            className="h-10 w-10"
            style={{ color: accentColor }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
