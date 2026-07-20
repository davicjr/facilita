import type { ReactNode } from 'react';
import PublicThemeToggle from '@/components/public-theme-toggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="motion-page relative min-h-screen overflow-hidden text-foreground">
      <div className="pointer-events-none absolute -top-40 left-[-8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(155,179,170,0.22),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-48 right-[-12%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(16,44,50,0.16),transparent_72%)] blur-2xl" />

      <div className="absolute right-6 top-6 z-20">
        <PublicThemeToggle className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/85 text-muted-foreground shadow-[0_10px_24px_rgba(16,44,50,0.12)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:text-foreground" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-border/70 bg-card/90 p-10 shadow-[0_28px_60px_rgba(16,44,50,0.18)] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 sm:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-size:56px_56px] bg-[linear-gradient(rgba(155,179,170,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(155,179,170,0.2)_1px,transparent_1px)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(155,179,170,0.18),transparent_65%)]" />
          <div className="pointer-events-none absolute -left-16 -bottom-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(16,44,50,0.10),transparent_70%)]" />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
