'use client';

import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Controle de acesso
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground">
          Criar usuario
        </h1>
        <p className="text-[13px] sm:text-sm text-muted-foreground">
          O cadastro publico sera habilitado no proximo milestone.
        </p>
      </div>
      <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
        Voltar para login
      </Link>
    </div>
  );
}
