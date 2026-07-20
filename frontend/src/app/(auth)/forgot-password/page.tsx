'use client';

import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Recuperacao
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">
          Recuperar senha
        </h1>
        <p className="text-[13px] sm:text-sm text-muted-foreground">
          O fluxo de recuperacao sera habilitado no proximo milestone.
        </p>
      </div>
      <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
        Voltar para login
      </Link>
    </div>
  );
}
