'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getAccessibleNavGroups } from '@/lib/permissions';
import type { NavMode } from '@/stores/ui-store';

function isActive(pathname: string, href: string) {
  // Match exato: um item pai (ex.: /admin) não deve ficar "sempre ativo" nas
  // subpáginas (/admin/*). Prefixo aqui deixava o item pai destacado E
  // não-clicável (preventDefault no onClick abaixo), travando a navegação.
  return pathname === href;
}

type AppNavProps = {
  collapsed?: boolean;
  navMode?: NavMode;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
};

export default function AppNav({
  collapsed = false,
  navMode = 'manual',
  onToggleCollapse,
  onNavigate,
}: AppNavProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  const groups = useMemo(() => {
    if (!user) return [];

    return getAccessibleNavGroups(user);
  }, [user]);

  return (
    <div className="fac-nav-panel" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="fac-nav-brand-shell">
        <button
          type="button"
          className="fac-nav-brand"
          aria-label={
            navMode === 'manual'
              ? collapsed
                ? 'Expandir barra lateral'
                : 'Recolher barra lateral'
              : 'Modo automatico ativo'
          }
          title={
            navMode === 'manual'
              ? collapsed
                ? 'Expandir barra lateral'
                : 'Recolher barra lateral'
              : 'Modo automatico ativo'
          }
          onClick={() => {
            if (onToggleCollapse) {
              onToggleCollapse();
              return;
            }

            onNavigate?.();
          }}
        >
          <span className="fac-nav-brand-wordmark">{collapsed ? 'F' : 'FACILITA'}</span>
        </button>
      </div>

      <div className="fac-nav-sections">
        {groups.map((group) => (
          <section key={group.label} className="fac-nav-group">
            {!collapsed ? <p className="fac-nav-label">{group.label}</p> : null}
            <nav className="fac-nav-list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-active={active ? 'true' : 'false'}
                    className="fac-nav-item"
                    aria-label={collapsed ? item.label : undefined}
                    onClick={(event) => {
                      if (active) {
                        event.preventDefault();
                      }
                      onNavigate?.();
                    }}
                    aria-current={active ? 'page' : undefined}
                    aria-disabled={active}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="fac-nav-item-icon" />
                    <span className="fac-nav-item-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </div>
  );
}
