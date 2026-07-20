'use client';

import {
  FileText,
  LayoutGrid,
  Link2,
  StickyNote,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import AdminFilterSelect from '@/components/admin/filter-select';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import { getContentTypeColor } from '@/lib/content-type';
import { getApiErrorMessage } from '@/lib/error';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

type PeriodFilter = 'ALL' | '30' | '7';
type ContentFilter = 'ALL' | 'LINK' | 'SCHEDULE' | 'NOTE';

type DashboardSummary = {
  users: number;
  usersActive: number;
  links: number;
  linkActive: number;
  schedules: number;
  scheduleActive: number;
  notes: number;
  noteActive: number;
  totalItems: number;
  totalCategories: number;
  topCategories: Array<{
    name: string;
    count: number;
  }>;
};

type DashboardShellProps = {
  count: number | string;
  actions?: ReactNode;
  children: ReactNode;
};

type DashboardMetricCardProps = {
  kicker: string;
  title?: string;
  value: number;
  accent: string;
  icon: LucideIcon;
  meta: string[];
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

type DashboardInsightCardProps = {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const EMPTY_SUMMARY: DashboardSummary = {
  users: 0,
  usersActive: 0,
  links: 0,
  linkActive: 0,
  schedules: 0,
  scheduleActive: 0,
  notes: 0,
  noteActive: 0,
  totalItems: 0,
  totalCategories: 0,
  topCategories: [],
};

function formatContentLabel(content: ContentFilter) {
  if (content === 'ALL') return 'Todos os conteudos';
  if (content === 'LINK') return 'Somente links';
  if (content === 'SCHEDULE') return 'Somente documentos';
  return 'Somente notas';
}

function toggleContentSelection(
  current: ContentFilter,
  next: Exclude<ContentFilter, 'ALL'>,
): ContentFilter {
  return current === next ? 'ALL' : next;
}

function DashboardShell({ count, actions, children }: DashboardShellProps) {
  return (
    <div
      className="fac-page"
      style={{ animation: 'fadeUp var(--duration-slow) var(--ease-out) both' }}
    >
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Dashboard"
          count={count}
          actions={actions}
          actionsClassName="sm:grid-cols-2"
        />
        <div className="fac-panel-body space-y-4">{children}</div>
      </section>
    </div>
  );
}

function DashboardMetricCard({
  kicker,
  title,
  value,
  accent,
  icon: Icon,
  meta,
  active = false,
  onClick,
  className,
}: DashboardMetricCardProps) {
  const isInteractive = typeof onClick === 'function';
  const cardStyle = {
    borderColor: `color-mix(in srgb, ${accent} ${active ? 36 : 22}%, var(--border) ${active ? 64 : 78}%)`,
    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${active ? 14 : 10}%, var(--card) ${active ? 86 : 90}%) 0%, color-mix(in srgb, ${accent} ${active ? 7 : 4}%, var(--card) ${active ? 93 : 96}%) 100%)`,
  };

  const content = (
    <>
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="fac-kicker">{kicker}</p>
          <p className="mt-3 font-display text-[38px] leading-none text-foreground">{value}</p>
          {title ? <p className="mt-2 text-[14px] text-foreground">{title}</p> : null}
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border"
          style={{
            borderColor: `color-mix(in srgb, ${accent} 32%, var(--border) 68%)`,
            background: `color-mix(in srgb, ${accent} 12%, var(--card) 88%)`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 space-y-1 text-[12px] text-muted-foreground">
        {meta.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        className={cn(
          'relative overflow-hidden rounded-[20px] border p-5 text-left shadow-[0_12px_30px_rgba(15,22,26,0.08)] transition duration-200',
          'hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,22,26,0.12)]',
          active && 'translate-y-[-2px] shadow-[0_18px_36px_rgba(15,22,26,0.16)]',
          className,
        )}
        style={cardStyle}
        onClick={onClick}
        aria-pressed={active}
      >
        {content}
      </button>
    );
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border p-5 shadow-[0_12px_30px_rgba(15,22,26,0.08)]',
        className,
      )}
      style={cardStyle}
    >
      {content}
    </article>
  );
}

function DashboardInsightCard({
  kicker,
  title,
  description,
  children,
  className,
}: DashboardInsightCardProps) {
  return (
    <article
      className={cn(
        'fac-form-card h-full border border-border/70 bg-card/78 shadow-[0_12px_30px_rgba(15,22,26,0.08)]',
        className,
      )}
    >
      <p className="fac-kicker">{kicker}</p>
      <h2 className="mt-2 text-[18px] text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </article>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const canViewDashboard = hasPermission(user, 'canViewDashboard');

  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [content, setContent] = useState<ContentFilter>('ALL');

  useEffect(() => {
    let active = true;

    if (!hasHydrated) {
      return () => {
        active = false;
      };
    }

    if (!user || !canViewDashboard) {
      setLoading(false);
      setSummary(EMPTY_SUMMARY);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get('/dashboard/summary', {
          params: {
            period,
            content,
          },
          skipNotify: true,
        });

        if (!active) {
          return;
        }

        setSummary({
          ...EMPTY_SUMMARY,
          ...(response.data ?? {}),
          topCategories: Array.isArray(response.data?.topCategories)
            ? response.data.topCategories
            : [],
        });
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        setError(getApiErrorMessage(err, 'Nao foi possivel carregar o dashboard.'));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [canViewDashboard, content, hasHydrated, period, user]);

  const periodLabel = period === 'ALL' ? 'Periodo completo' : `Ultimos ${period} dias`;
  const contentLabel = formatContentLabel(content);

  const contentMetricCards = useMemo(
    () =>
      [
        {
          key: 'links',
          kicker: 'Links',
          value: summary.links,
          accent: getContentTypeColor('LINK'),
          icon: Link2,
          filterValue: 'LINK' as const,
          meta: [`Ativos: ${summary.linkActive} • Inativos: ${summary.links - summary.linkActive}`],
        },
        {
          key: 'documents',
          kicker: 'Documentos',
          value: summary.schedules,
          accent: getContentTypeColor('SCHEDULE'),
          icon: FileText,
          filterValue: 'SCHEDULE' as const,
          meta: [
            `Ativos: ${summary.scheduleActive} • Inativos: ${summary.schedules - summary.scheduleActive}`,
          ],
        },
        {
          key: 'notes',
          kicker: 'Notas',
          value: summary.notes,
          accent: getContentTypeColor('NOTE'),
          icon: StickyNote,
          filterValue: 'NOTE' as const,
          meta: [`Ativas: ${summary.noteActive} • Inativas: ${summary.notes - summary.noteActive}`],
        },
      ] satisfies Array<{
        key: string;
        kicker: string;
        value: number;
        accent: string;
        icon: LucideIcon;
        filterValue: Exclude<ContentFilter, 'ALL'>;
        meta: string[];
      }>,
    [summary],
  );

  const summaryCards = useMemo(
    () =>
      [
        {
          key: 'total',
          label: 'Total de itens',
          value: summary.totalItems,
          accent: 'var(--primary)',
          icon: LayoutGrid,
        },
        {
          key: 'users',
          label: 'Usuarios ativos',
          value: summary.usersActive,
          accent: 'var(--accent)',
          icon: Users,
        },
      ] satisfies Array<{
        key: string;
        label: string;
        value: number;
        accent: string;
        icon: LucideIcon;
      }>,
    [summary],
  );

  const headerActions = (
    <>
      <AdminFilterSelect
        value={period}
        onChange={(event) => setPeriod(event.target.value as PeriodFilter)}
      >
        <option value="ALL">Todo o periodo</option>
        <option value="30">Ultimos 30 dias</option>
        <option value="7">Ultimos 7 dias</option>
      </AdminFilterSelect>

      <AdminFilterSelect
        value={content}
        onChange={(event) => setContent(event.target.value as ContentFilter)}
      >
        <option value="ALL">Todos os conteudos</option>
        <option value="LINK">Links</option>
        <option value="SCHEDULE">Documentos</option>
        <option value="NOTE">Notas</option>
      </AdminFilterSelect>
    </>
  );

  if (hasHydrated && !user) {
    return (
      <DashboardShell count={0}>
        <div className="fac-error-state">Faca login para acessar o dashboard.</div>
      </DashboardShell>
    );
  }

  if (hasHydrated && !canViewDashboard) {
    return (
      <DashboardShell count={0}>
        <div className="fac-error-state">Acesso restrito.</div>
      </DashboardShell>
    );
  }

  const categoryAccents = [
    'var(--primary)',
    getContentTypeColor('LINK'),
    'var(--accent)',
    getContentTypeColor('NOTE'),
  ];

  const topCategoryMax = summary.topCategories[0]?.count || 1;

  return (
    <DashboardShell count={loading ? '...' : summary.totalItems} actions={headerActions}>
      {loading ? (
        <div className="fac-loading-state">Carregando dashboard...</div>
      ) : error ? (
        <div className="fac-error-state">{error}</div>
      ) : (
        <>
          <section
            className="relative overflow-hidden rounded-[24px] border border-border/70 p-5 shadow-[0_14px_34px_rgba(15,22,26,0.08)]"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--card) 92%) 0%, color-mix(in srgb, var(--accent) 6%, var(--card) 94%) 100%)',
            }}
          >
            <div className="absolute right-[-32px] top-[-40px] h-40 w-40 rounded-full bg-primary/8 blur-3xl" />

            <div className="relative space-y-5">
              <div className="max-w-[56ch] space-y-3">
                <h1 className="fac-title-md">Visao geral</h1>

                <div className="flex flex-wrap gap-2">
                  {[periodLabel, contentLabel].map((label) => (
                    <span
                      key={label}
                      className="inline-flex h-8 items-center rounded-full border border-border/70 bg-background/55 px-4 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {summaryCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article
                      key={item.key}
                      className="rounded-[18px] border border-border/60 bg-background/32 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border"
                            style={{
                              borderColor: `color-mix(in srgb, ${item.accent} 28%, var(--border) 72%)`,
                              background: `color-mix(in srgb, ${item.accent} 12%, var(--card) 88%)`,
                              color: item.accent,
                            }}
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <p className="truncate text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            {item.label}
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-[34px] leading-none text-foreground">
                          {item.value}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contentMetricCards.map((card) => (
              <DashboardMetricCard
                key={card.key}
                kicker={card.kicker}
                value={card.value}
                accent={card.accent}
                icon={card.icon}
                meta={card.meta}
                active={content === card.filterValue}
                onClick={() => setContent((current) => toggleContentSelection(current, card.filterValue))}
              />
            ))}
          </div>

          <div className="grid gap-4">
            <DashboardInsightCard
              kicker="Categorias"
              title="Categorias em destaque"
              description={`Baseado no filtro atual. ${summary.totalCategories} categoria(s) com conteudo no recorte.`}
            >
              {summary.topCategories.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border/70 bg-background/35 px-4 py-6 text-center text-[13px] text-muted-foreground">
                  Sem categorias no periodo selecionado.
                </div>
              ) : (
                <ul className="space-y-3">
                  {summary.topCategories.map((category, index) => {
                    const accent = categoryAccents[index % categoryAccents.length];

                    return (
                      <li
                        key={category.name}
                        className="rounded-[16px] border border-border/60 bg-background/35 px-3 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-primary-foreground"
                            style={{ backgroundColor: accent }}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="line-clamp-1 text-[14px] text-foreground">
                                {category.name}
                              </span>
                              <strong className="text-[14px] text-foreground">
                                {category.count}
                              </strong>
                            </div>

                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/70">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(category.count / topCategoryMax) * 100}%`,
                                  backgroundColor: accent,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashboardInsightCard>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
