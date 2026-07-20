'use client';

import type { ReactNode } from 'react';

export default function MaxWidth({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
