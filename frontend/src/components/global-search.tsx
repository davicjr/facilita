'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Folder,
  HardDrive,
  Home,
  ImageIcon,
  LayoutDashboard,
  Link2,
  Loader2,
  Power,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Shield,
  Star,
  StickyNote,
  User,
  Users,
  X,
} from 'lucide-react';
import FileViewerModal from '@/components/admin/file-viewer-modal';
import NoteViewerModal from '@/components/note-viewer-modal';
import api from '@/lib/api';
import { getGlobalSearchPageCatalog } from '@/lib/global-search-catalog';
import { resolveAssetUrl } from '@/lib/image';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { GlobalSearchResponse, GlobalSearchResult } from '@/types/global-search';

type GlobalSearchProps = {
  open: boolean;
  onClose: () => void;
};

const sectionOrder: GlobalSearchResult['section'][] = [
  'Paginas',
  'Conteudo',
  'Categorias',
  'Midia',
  'Cadastros',
];

const sourceLabel: Record<GlobalSearchResult['source'], string> = {
  SYSTEM: 'Pagina',
  OWNED: 'Seu',
  PUBLIC: 'Publico',
  SHARED: 'Compartilhado',
  ADMIN: 'Admin',
};

function getPageIcon(href?: string) {
  switch (href) {
    case '/':
      return Home;
    case '/dashboard':
      return LayoutDashboard;
    case '/favoritos':
      return Star;
    case '/compartilhados':
      return Share2;
    case '/admin/categories':
      return Folder;
    case '/admin/links':
      return Link2;
    case '/admin/schedules':
      return FileText;
    case '/admin/notes':
      return StickyNote;
    case '/admin/images':
      return ImageIcon;
    case '/admin/users':
      return Users;
    case '/admin/permissions':
      return Shield;
    case '/admin/settings':
      return Settings;
    case '/admin/backup':
      return HardDrive;
    case '/admin/restore':
      return RotateCcw;
    case '/admin/reset':
      return Power;
    default:
      return Search;
  }
}

function getResultIcon(result: GlobalSearchResult) {
  if (result.kind === 'PAGE') {
    return getPageIcon(result.href);
  }

  if (result.kind === 'LINK') return Link2;
  if (result.kind === 'SCHEDULE') return FileText;
  if (result.kind === 'NOTE') return StickyNote;
  if (result.kind === 'CATEGORY') return Folder;
  if (result.kind === 'IMAGE') return ImageIcon;
  return User;
}

function buildSectionMap(items: GlobalSearchResult[]) {
  const groups = new Map<GlobalSearchResult['section'], GlobalSearchResult[]>();

  items.forEach((item) => {
    const current = groups.get(item.section) ?? [];
    current.push(item);
    groups.set(item.section, current);
  });

  return sectionOrder
    .map((section) => ({
      section,
      items: groups.get(section) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dynamicResults, setDynamicResults] = useState<GlobalSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedNote, setSelectedNote] = useState<{
    title: string;
    content: string;
    imageUrl?: string | null;
    color?: string | null;
    category?: {
      name?: string | null;
      color?: string | null;
      icon?: string | null;
    } | null;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);

  const pageResults = useMemo(() => {
    const items = getGlobalSearchPageCatalog(user, query);
    return query.trim() ? items.slice(0, 8) : items.slice(0, 10);
  }, [query, user]);

  const results = useMemo(() => {
    const deduped = new Map<string, GlobalSearchResult>();

    [...pageResults, ...dynamicResults].forEach((item) => {
      if (!deduped.has(item.id)) {
        deduped.set(item.id, item);
      }
    });

    return Array.from(deduped.values());
  }, [dynamicResults, pageResults]);

  const sections = useMemo(() => buildSectionMap(results), [results]);
  const flatResults = useMemo(() => sections.flatMap((group) => group.items), [sections]);
  const flatIndexById = useMemo(
    () => new Map(flatResults.map((item, index) => [item.id, index])),
    [flatResults],
  );
  const trimmedQuery = query.trim();
  const isIdle = trimmedQuery.length === 0;

  useEffect(() => {
    if (!open) {
      searchRequestRef.current += 1;
      setQuery('');
      setDynamicResults([]);
      setLoading(false);
      setSelectedIndex(0);
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setSelectedIndex((current) => {
      if (flatResults.length === 0) {
        return 0;
      }

      return Math.min(current, flatResults.length - 1);
    });
  }, [flatResults.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const currentQuery = trimmedQuery;
    if (currentQuery.length < 2) {
      setDynamicResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await api.get<GlobalSearchResponse>('/search/global', {
          params: {
            q: currentQuery,
            limit: 18,
          },
          skipNotify: true,
        });

        if (searchRequestRef.current !== requestId) {
          return;
        }

        setDynamicResults(
          Array.isArray(response.data?.items) ? response.data.items : [],
        );
      } catch {
        if (searchRequestRef.current !== requestId) {
          return;
        }

        setDynamicResults([]);
      } finally {
        if (searchRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [open, trimmedQuery]);

  const handleSelect = (result: GlobalSearchResult) => {
    if (
      result.kind === 'LINK' &&
      result.externalUrl &&
      !(result.source === 'SHARED' && result.status === 'INACTIVE')
    ) {
      onClose();
      window.open(result.externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (
      result.kind === 'SCHEDULE' &&
      result.fileUrl &&
      result.fileName &&
      !(result.source === 'SHARED' && result.status === 'INACTIVE')
    ) {
      onClose();
      setSelectedFile({
        id: result.entityId,
        name: result.fileName,
        url: result.fileUrl,
      });
      return;
    }

    if (
      result.kind === 'NOTE' &&
      result.noteContent &&
      !(result.source === 'SHARED' && result.status === 'INACTIVE')
    ) {
      onClose();
      setSelectedNote({
        title: result.title,
        content: result.noteContent,
        imageUrl: result.imageUrl,
        color: result.category?.color ?? null,
        category: result.category ?? null,
      });
      return;
    }

    if (result.kind === 'IMAGE' && result.imageUrl) {
      onClose();
      window.open(resolveAssetUrl(result.imageUrl), '_blank', 'noopener,noreferrer');
      return;
    }

    if (result.href) {
      onClose();
      router.push(result.href);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {open ? (
        <div
          className="fac-global-search-root"
          role="dialog"
          aria-modal="true"
          data-idle={isIdle}
        >
          <button
            type="button"
            className="fac-global-search-backdrop"
            onClick={onClose}
            aria-label="Fechar busca global"
          />

          <div className="fac-global-search-panel" data-idle={isIdle}>
            <div className="fac-global-search-head">
              <label className="fac-global-search-input-shell">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      onClose();
                      return;
                    }

                    if (flatResults.length === 0) {
                      return;
                    }

                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setSelectedIndex((current) => (current + 1) % flatResults.length);
                      return;
                    }

                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setSelectedIndex((current) =>
                        current === 0 ? flatResults.length - 1 : current - 1,
                      );
                      return;
                    }

                    if (event.key === 'Enter') {
                      event.preventDefault();
                      const target = flatResults[selectedIndex];
                      if (target) {
                        handleSelect(target);
                      }
                    }
                  }}
                  type="search"
                  placeholder="Buscar paginas, notas, links, documentos, imagens e usuarios"
                  aria-label="Busca global"
                />
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : null}
                {query ? (
                  <button
                    type="button"
                    className="fac-global-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </label>

              <button
                type="button"
                onClick={onClose}
                className="fac-global-search-close"
                aria-label="Fechar busca global"
              >
                Esc
              </button>
            </div>

            {!isIdle ? (
              <>
                <div className="fac-global-search-body">
                  {sections.length > 0 ? (
                    sections.map((group) => (
                      <section key={group.section} className="fac-global-search-section">
                        <div className="fac-global-search-section-head">
                          <span>{group.section}</span>
                          <span>{group.items.length}</span>
                        </div>

                        <div className="fac-global-search-list">
                          {group.items.map((item) => {
                            const index = flatIndexById.get(item.id) ?? 0;
                            const Icon = getResultIcon(item);
                            const isSelected = index === selectedIndex;
                            const isInactive = item.status === 'INACTIVE';

                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={cn(
                                  'fac-global-search-item',
                                  isSelected && 'is-selected',
                                  isInactive && 'is-inactive',
                                )}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => handleSelect(item)}
                              >
                                <span className="fac-global-search-item-icon">
                                  <Icon className="h-4 w-4" />
                                </span>

                                <span className="fac-global-search-item-copy">
                                  <span className="fac-global-search-item-title-row">
                                    <span className="truncate">{item.title}</span>
                                    <span className="fac-global-search-item-badges">
                                      <span className="fac-global-search-pill">
                                        {sourceLabel[item.source]}
                                      </span>
                                      {isInactive ? (
                                        <span className="fac-global-search-pill" data-variant="warning">
                                          Inativo
                                        </span>
                                      ) : null}
                                    </span>
                                  </span>

                                  {item.subtitle ? (
                                    <span className="truncate text-[12px] text-foreground/80">
                                      {item.subtitle}
                                    </span>
                                  ) : null}

                                  {item.description ? (
                                    <span className="line-clamp-1 text-[12px] text-muted-foreground">
                                      {item.description}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))
                  ) : (
                    <div className="fac-global-search-empty">
                      {trimmedQuery.length >= 2
                        ? 'Nenhum resultado encontrado para essa busca.'
                        : 'Digite pelo menos 2 caracteres para buscar conteudo.'}
                    </div>
                  )}
                </div>

                <div className="fac-global-search-foot">
                  <span>Ctrl+B abre a busca global</span>
                  <span>Setas navegam</span>
                  <span>Enter abre</span>
                  <span>Esc fecha</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <NoteViewerModal
        open={Boolean(selectedNote)}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        panelClassName="max-w-3xl"
      />

      <FileViewerModal
        open={Boolean(selectedFile)}
        scheduleId={selectedFile?.id}
        fileName={selectedFile?.name ?? ''}
        fileUrl={selectedFile?.url ?? ''}
        onClose={() => setSelectedFile(null)}
      />
    </>
  );
}
