'use client';

import { FormEvent, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  const staggerStyle = (index: number) => ({ '--stagger-index': index } as CSSProperties);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      setAuth(response.data.user, response.data.accessToken);
      // Retorna ao destino de onde a sessão expirou (?next=), se houver.
      // Só aceita caminho interno — evita open redirect para URL externa.
      const nextParam = new URLSearchParams(window.location.search).get('next');
      const destination =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
          ? nextParam
          : '/';
      router.push(destination);
    } catch {
      // Notifications handled in the API interceptor.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 motion-stagger">

      {/* Header */}
      <div className="motion-item space-y-3" style={staggerStyle(1)}>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Facilita
        </div>
        <h1 className="font-display text-[32px] leading-tight text-foreground">
          Bem-vindo de volta
        </h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Entre com suas credenciais para acessar o portal.
        </p>
      </div>

      {/* Divider */}
      <div className="motion-item h-px bg-gradient-to-r from-transparent via-border to-transparent" style={staggerStyle(2)} />

      {/* Form */}
      <form onSubmit={onSubmit} className="motion-item space-y-5" style={staggerStyle(3)}>
        <div className="space-y-2">
          <label
            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            htmlFor="username"
          >
            Usuário
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="seu.usuario"
            className="w-full rounded-[11px] border border-border/70 bg-background/60 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 shadow-[0_4px_12px_rgba(16,44,50,0.07)] transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            htmlFor="password"
          >
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-[11px] border border-border/70 bg-background/60 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/40 shadow-[0_4px_12px_rgba(16,44,50,0.07)] transition focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="motion-press mt-1 w-full rounded-[11px] bg-primary py-3.5 text-[14px] font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(16,44,50,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(16,44,50,0.30)] disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      {/* Back link */}
      <div className="motion-item" style={staggerStyle(4)}>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/70 transition hover:text-muted-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar para a página inicial
        </Link>
      </div>

    </div>
  );
}
