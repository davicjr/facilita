'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, Link2, Share2, Star } from 'lucide-react';
import AdminFilterSelect from '@/components/admin/filter-select';
import FileViewerModal from '@/components/admin/file-viewer-modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import FavoriteItemCard, { type FavoriteCardItem } from '@/components/favorite-item-card';
import NoteViewerModal from '@/components/note-viewer-modal';
import PublicThemeToggle from '@/components/public-theme-toggle';
import useClientPagination from '@/hooks/use-client-pagination';
import { getContrastTextColor } from '@/lib/color';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { Link as LinkType, Note, Share, UploadedSchedule } from '@/types';

// ─── Landing page ─────────────────────────────────────────────────────────────

const staggerStyle = (index: number) => ({ '--stagger-index': index } as CSSProperties);

const pillars = [
  {
    icon: Link2,
    label: 'Links',
    title: 'Centralize seus links',
    description: 'Salve e organize links com categorias, capas e descrições. Encontre qualquer um em segundos com busca instantânea.',
  },
  {
    icon: FileText,
    label: 'Documentos',
    title: 'Acesse seus documentos',
    description: 'Faça upload de PDFs, planilhas e apresentações. Visualize direto no navegador, sem precisar baixar.',
  },
  {
    icon: BookOpen,
    label: 'Notas',
    title: 'Escreva e consulte notas',
    description: 'Editor de texto completo para criar notas ricas. Organize por categoria e acesse de qualquer lugar.',
  },
];

function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ animation: 'fadeUp var(--duration-slow) var(--ease-out) both' }}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground shadow-[0_6px_18px_rgba(16,44,50,0.06)] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Facilita
        </div>
        <PublicThemeToggle className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/85 text-muted-foreground shadow-[0_10px_24px_rgba(16,44,50,0.10)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:text-foreground" />
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-20 text-center motion-stagger">
        <div className="motion-item space-y-4" style={staggerStyle(1)}>
          <h1 className="font-display text-5xl leading-[1.1] text-foreground sm:text-6xl lg:text-7xl">
            Links, documentos<br />
            <span className="sm:whitespace-nowrap">
            e notas —{' '}
            <span className="text-primary">organizados.</span>
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            <span className="sm:whitespace-nowrap">
            Um portal pessoal para guardar o que importa, encontrar rápido e compartilhar quando precisar.
            </span>
          </p>
          <div className="motion-item pt-5" style={staggerStyle(2)}>
            <Link
              href="/login"
              className="motion-press inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[13px] font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(15,55,65,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,55,65,0.3)] sm:text-sm"
            >
              Entrar no Facilita
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.label}
                className="group flex flex-col gap-4 rounded-[20px] border border-border/60 bg-card/80 p-7 shadow-[0_6px_20px_rgba(15,22,26,0.06)]"
                style={staggerStyle(i + 1)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary/[0.09] text-primary">
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                    {pillar.label}
                  </span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">{pillar.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{pillar.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Extras row */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-[16px] border border-border/50 bg-card/50 px-6 py-5">
            <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">Compartilhamento seletivo</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Envie itens específicos para colegas sem tornar nada público. Você controla quem vê o quê.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 rounded-[16px] border border-border/50 bg-card/50 px-6 py-5">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">Favoritos de acesso rápido</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                Marque os itens mais usados para acessá-los diretamente, sem precisar buscar toda vez.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// ─── Home (authenticated) ─────────────────────────────────────────────────────

type ContentType = 'ALL' | 'LINK' | 'SCHEDULE' | 'NOTE';
type SourceFilter = 'ALL' | 'OWN' | 'SHARED';

function HomePage() {
  const user = useAuthStore((state) => state.user);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const canViewLinks = hasPermission(user, 'canViewLinks');
  const canViewSchedules = hasPermission(user, 'canViewSchedules');
  const canViewNotes = hasPermission(user, 'canViewNotes');
  const [typeFilter, setTypeFilter] = useState<ContentType>('ALL');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [links, setLinks] = useState<LinkType[]>([]);
  const [schedules, setSchedules] = useState<UploadedSchedule[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [receivedShares, setReceivedShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: string; url: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [linksRes, schedulesRes, notesRes, receivedSharesRes] = await Promise.all([
        canViewLinks ? api.get('/links') : Promise.resolve({ data: [] }),
        canViewSchedules ? api.get('/schedules') : Promise.resolve({ data: [] }),
        canViewNotes ? api.get('/notes') : Promise.resolve({ data: [] }),
        user?.role === 'SUPERADMIN' ? Promise.resolve({ data: [] }) : api.get('/shares/received'),
      ]);
      setLinks(Array.isArray(linksRes.data) ? linksRes.data : []);
      setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setReceivedShares(Array.isArray(receivedSharesRes.data) ? receivedSharesRes.data : []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar os itens.'));
    } finally {
      setLoading(false);
    }
  }, [canViewLinks, canViewNotes, canViewSchedules, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableTypes = useMemo(
    () =>
      [
        canViewLinks ? 'LINK' : null,
        canViewSchedules ? 'SCHEDULE' : null,
        canViewNotes ? 'NOTE' : null,
      ].filter((type): type is Exclude<ContentType, 'ALL'> => Boolean(type)),
    [canViewLinks, canViewNotes, canViewSchedules],
  );

  const effectiveTypeFilter =
    typeFilter === 'ALL' || availableTypes.includes(typeFilter) ? typeFilter : 'ALL';

  const receivedItems = useMemo<FavoriteCardItem[]>(() => {
    return receivedShares
      .map<FavoriteCardItem | null>((share) => {
        if (share.entityType === 'LINK' && share.link && canViewLinks) {
          return {
            id: share.link.id,
            type: 'LINK',
            title: share.link.title,
            description: share.link.description || undefined,
            url: share.link.url,
            imageUrl: share.link.imageUrl,
            imagePosition: share.link.imagePosition,
            imageScale: share.link.imageScale,
            categoryName: share.localCategory?.name || share.link.category?.name,
            categoryColor: share.localCategory?.color || share.link.category?.color || null,
            categoryIcon: share.link.category?.icon || null,
            sourceKind: 'SHARED',
            sharedByName: share.owner?.name,
            status: share.link.status,
          };
        }

        if (share.entityType === 'SCHEDULE' && share.schedule && canViewSchedules) {
          return {
            id: share.schedule.id,
            type: 'SCHEDULE',
            title: share.schedule.title,
            fileUrl: share.schedule.fileUrl,
            fileName: share.schedule.fileName,
            imageUrl: share.schedule.imageUrl,
            imagePosition: share.schedule.imagePosition,
            imageScale: share.schedule.imageScale,
            categoryName: share.localCategory?.name || share.schedule.category?.name,
            categoryColor: share.localCategory?.color || share.schedule.category?.color || null,
            categoryIcon: share.schedule.category?.icon || null,
            sourceKind: 'SHARED',
            sharedByName: share.owner?.name,
            status: share.schedule.status,
          };
        }

        if (share.entityType === 'NOTE' && share.note && canViewNotes) {
          return {
            id: share.note.id,
            type: 'NOTE',
            title: share.note.title,
            content: share.note.content,
            imageUrl: share.note.imageUrl,
            imagePosition: share.note.imagePosition,
            imageScale: share.note.imageScale,
            categoryName: share.localCategory?.name || share.note.category?.name,
            categoryColor: share.localCategory?.color || share.note.category?.color || null,
            categoryIcon: share.note.category?.icon || null,
            sourceKind: 'SHARED',
            sharedByName: share.owner?.name,
            status: share.note.status,
          };
        }

        return null;
      })
      .filter((item): item is FavoriteCardItem => item !== null);
  }, [canViewLinks, canViewNotes, canViewSchedules, receivedShares]);

  const allItems = useMemo<FavoriteCardItem[]>(() => {
    const linkItems: FavoriteCardItem[] = links.map((link) => ({
      id: link.id,
      type: 'LINK',
      title: link.title,
      description: link.description || undefined,
      url: link.url,
      imageUrl: link.imageUrl,
      imagePosition: link.imagePosition,
      imageScale: link.imageScale,
      categoryName: link.category?.name,
      categoryColor: link.category?.color || null,
      categoryIcon: link.category?.icon || null,
      sourceKind: 'OWN',
      status: link.status,
    }));

    const scheduleItems: FavoriteCardItem[] = schedules.map((schedule) => ({
      id: schedule.id,
      type: 'SCHEDULE',
      title: schedule.title,
      fileUrl: schedule.fileUrl,
      fileName: schedule.fileName,
      imageUrl: schedule.imageUrl,
      imagePosition: schedule.imagePosition,
      imageScale: schedule.imageScale,
      categoryName: schedule.category?.name,
      categoryColor: schedule.category?.color || null,
      categoryIcon: schedule.category?.icon || null,
      sourceKind: 'OWN',
      status: schedule.status,
    }));

    const noteItems: FavoriteCardItem[] = notes.map((note) => ({
      id: note.id,
      type: 'NOTE',
      title: note.title,
      content: note.content,
      imageUrl: note.imageUrl,
      imagePosition: note.imagePosition,
      imageScale: note.imageScale,
      categoryName: note.category?.name,
      categoryColor: note.category?.color || null,
      categoryIcon: note.category?.icon || null,
      sourceKind: 'OWN',
      status: note.status,
    }));

    return [...linkItems, ...scheduleItems, ...noteItems, ...receivedItems];
  }, [links, notes, receivedItems, schedules]);

  const searchedItems = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return allItems
      .filter((item) => (effectiveTypeFilter === 'ALL' ? true : item.type === effectiveTypeFilter))
      .filter((item) => (sourceFilter === 'ALL' ? true : item.sourceKind === sourceFilter))
      .filter((item) => {
        if (!term) return true;
        const haystack = [item.title, item.description, item.content, item.categoryName, item.fileName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [allItems, effectiveTypeFilter, globalSearch, sourceFilter]);

  const categoryTabs = useMemo(() => {
    const map = new Map<string, { count: number; color?: string | null }>();
    searchedItems.forEach((item) => {
      const name = item.categoryName || 'Sem categoria';
      const current = map.get(name);
      if (current) {
        current.count += 1;
        if (!current.color && item.categoryColor) current.color = item.categoryColor;
      } else {
        map.set(name, { count: 1, color: item.categoryColor || null });
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, color: data.color || null }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchedItems]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'ALL') return searchedItems;
    return searchedItems.filter((item) => (item.categoryName || 'Sem categoria') === categoryFilter);
  }, [searchedItems, categoryFilter]);

  const {
    containerRef: gridRef,
    pageItems: pagedItems,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filteredItems);

  const noteMap = useMemo(() => {
    const map = new Map<string, Note>();
    notes.forEach((note) => map.set(note.id, note));
    receivedShares.forEach((share) => {
      if (share.entityType === 'NOTE' && share.note) {
        map.set(share.note.id, share.note);
      }
    });
    return map;
  }, [notes, receivedShares]);

  const openItem = (item: FavoriteCardItem) => {
    if (item.status !== 'ACTIVE') return;

    if (item.type === 'LINK' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (item.type === 'SCHEDULE' && item.fileUrl) {
      setViewingFile({ id: item.id, url: item.fileUrl, name: item.fileName || item.title });
      return;
    }

    if (item.type === 'NOTE') {
      const note = noteMap.get(item.id);
      if (note) setSelectedNote(note);
    }
  };

  const activeSearch = globalSearch.trim();
  const hasActiveFilters =
    activeSearch.length > 0 ||
    effectiveTypeFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    categoryFilter !== 'ALL';
  const emptyMessage = activeSearch
    ? `Nenhum resultado para "${activeSearch}".`
    : hasActiveFilters
      ? 'Nenhum item corresponde ao filtro.'
      : 'Nenhum item encontrado.';

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Início"
          count={filteredItems.length}
          actionsClassName="sm:grid-cols-2 xl:grid-cols-[220px_180px]"
          actions={
            <>
              <AdminFilterSelect
                value={effectiveTypeFilter}
                onChange={(event) => setTypeFilter(event.target.value as ContentType)}
              >
                <option value="ALL">Todos os tipos</option>
                {canViewLinks ? <option value="LINK">Links</option> : null}
                {canViewSchedules ? <option value="SCHEDULE">Documentos</option> : null}
                {canViewNotes ? <option value="NOTE">Notas</option> : null}
              </AdminFilterSelect>

              <AdminFilterSelect
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
              >
                <option value="ALL">Todas as origens</option>
                <option value="OWN">Meus itens</option>
                <option value="SHARED">Recebidos</option>
              </AdminFilterSelect>
            </>
          }
        />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-active={categoryFilter === 'ALL' ? 'true' : 'false'}
              className="fac-pill"
              onClick={() => setCategoryFilter('ALL')}
            >
              Todos ({searchedItems.length})
            </button>

            {categoryTabs.map((tab) => {
              const isActive = categoryFilter === tab.name;
              const textColor = tab.color ? getContrastTextColor(tab.color) : undefined;
              return (
                <button
                  key={tab.name}
                  type="button"
                  data-active={isActive ? 'true' : 'false'}
                  className="fac-pill"
                  style={
                    tab.color
                      ? isActive
                        ? { backgroundColor: tab.color, borderColor: tab.color, color: textColor }
                        : { borderColor: tab.color, color: tab.color }
                      : undefined
                  }
                  onClick={() => setCategoryFilter(tab.name)}
                >
                  {tab.name} ({tab.count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="fac-loading-state">Carregando itens...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="fac-empty-state">{emptyMessage}</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap gap-3">
                {pagedItems.map((item) => (
                  <FavoriteItemCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    detailsVariant="home"
                    onOpen={() => openItem(item)}
                    onDownload={
                      item.type === 'SCHEDULE' && item.fileUrl
                        ? () => setViewingFile({ id: item.id, url: item.fileUrl!, name: item.fileName || item.title })
                        : undefined
                    }
                  />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPrevious={previousPage}
                onNext={nextPage}
              />
            </>
          )}
        </div>
      </section>

      <NoteViewerModal
        open={Boolean(selectedNote)}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />

      <FileViewerModal
        open={Boolean(viewingFile)}
        scheduleId={viewingFile?.id}
        fileName={viewingFile?.name ?? ''}
        fileUrl={viewingFile?.url ?? ''}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}

// ─── Root page ─────────────────────────────────────────────────────────────────

export default function RootPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return null;
  }

  if (user) {
    return <HomePage />;
  }

  return <LandingPage />;
}
