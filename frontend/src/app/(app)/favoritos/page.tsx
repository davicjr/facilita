'use client';

import { useMemo, useState } from 'react';
import AdminFilterSelect from '@/components/admin/filter-select';
import FileViewerModal from '@/components/admin/file-viewer-modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import FavoriteItemCard, {
  type FavoriteCardItem,
} from '@/components/favorite-item-card';
import NoteViewerModal from '@/components/note-viewer-modal';
import useClientPagination from '@/hooks/use-client-pagination';
import { useFavorites, type EntityType } from '@/hooks/useFavorites';
import { getContrastTextColor } from '@/lib/color';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Note } from '@/types';

export default function FavoritosPage() {
  const user = useAuthStore((state) => state.user);
  const { favorites, loading, error } = useFavorites();

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [typeFilter, setTypeFilter] = useState<'ALL' | EntityType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: string; url: string; name: string } | null>(null);
  const canViewLinks = hasPermission(user, 'canViewLinks');
  const canViewSchedules = hasPermission(user, 'canViewSchedules');
  const canViewNotes = hasPermission(user, 'canViewNotes');

  const availableTypes = useMemo(
    () =>
      [
        canViewLinks ? 'LINK' : null,
        canViewSchedules ? 'SCHEDULE' : null,
        canViewNotes ? 'NOTE' : null,
      ].filter((type): type is EntityType => Boolean(type)),
    [canViewLinks, canViewNotes, canViewSchedules],
  );
  const effectiveTypeFilter =
    typeFilter === 'ALL' || availableTypes.includes(typeFilter) ? typeFilter : 'ALL';

  const items = useMemo<FavoriteCardItem[]>(() => {
    return favorites
      .map<FavoriteCardItem | null>((favorite) => {
        if (favorite.entityType === 'LINK' && favorite.link) {
          return {
            id: favorite.link.id,
            type: 'LINK',
            title: favorite.link.title,
            description: favorite.link.description || undefined,
            url: favorite.link.url,
            imageUrl: favorite.link.imageUrl,
            imagePosition: favorite.link.imagePosition,
            imageScale: favorite.link.imageScale,
            categoryName: favorite.link.category?.name,
            categoryColor: favorite.link.category?.color || null,
            categoryIcon: favorite.link.category?.icon || null,
            status: favorite.link.status,
          };
        }

        if (favorite.entityType === 'SCHEDULE' && favorite.schedule) {
          return {
            id: favorite.schedule.id,
            type: 'SCHEDULE',
            title: favorite.schedule.title,
            fileUrl: favorite.schedule.fileUrl,
            fileName: favorite.schedule.fileName,
            imageUrl: favorite.schedule.imageUrl,
            imagePosition: favorite.schedule.imagePosition,
            imageScale: favorite.schedule.imageScale,
            categoryName: favorite.schedule.category?.name,
            categoryColor: favorite.schedule.category?.color || null,
            categoryIcon: favorite.schedule.category?.icon || null,
            status: favorite.schedule.status,
          };
        }

        if (favorite.entityType === 'NOTE' && favorite.note) {
          return {
            id: favorite.note.id,
            type: 'NOTE',
            title: favorite.note.title,
            content: favorite.note.content,
            imageUrl: favorite.note.imageUrl,
            imagePosition: favorite.note.imagePosition,
            imageScale: favorite.note.imageScale,
            categoryName: favorite.note.category?.name,
            categoryColor: favorite.note.category?.color || null,
            categoryIcon: favorite.note.category?.icon || null,
            status: favorite.note.status,
          };
        }

        return null;
      })
      .filter((item): item is FavoriteCardItem => item !== null);
  }, [favorites]);

  const searchedItems = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return items
      .filter((item) => (effectiveTypeFilter === 'ALL' ? true : item.type === effectiveTypeFilter))
      .filter((item) => {
        if (!term) return true;

        const haystack = [
          item.title,
          item.description,
          item.content,
          item.categoryName,
          item.fileName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(term);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [effectiveTypeFilter, globalSearch, items]);

  const categoryTabs = useMemo(() => {
    const map = new Map<string, { count: number; color?: string | null }>();

    searchedItems.forEach((item) => {
      const name = item.categoryName || 'Sem categoria';
      const current = map.get(name);
      if (current) {
        current.count += 1;
        if (!current.color && item.categoryColor) {
          current.color = item.categoryColor;
        }
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
    return searchedItems.filter(
      (item) => (item.categoryName || 'Sem categoria') === categoryFilter,
    );
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
    favorites.forEach((favorite) => {
      if (favorite.entityType === 'NOTE' && favorite.note) {
        map.set(favorite.note.id, favorite.note);
      }
    });
    return map;
  }, [favorites]);

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
      if (note) {
        setSelectedNote(note);
      }
    }
  };

  const activeSearch = globalSearch.trim();
  const hasActiveFilters =
    activeSearch.length > 0 || typeFilter !== 'ALL' || categoryFilter !== 'ALL';
  const emptyMessage = activeSearch
    ? `Nenhum resultado para "${activeSearch}".`
    : hasActiveFilters
      ? 'Nenhum favorito corresponde ao filtro.'
      : 'Voce ainda nao tem favoritos.';

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Favoritos"
          count={filteredItems.length}
          actionsClassName="sm:max-w-[220px] xl:w-[220px]"
          actions={
            <AdminFilterSelect
              value={effectiveTypeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | EntityType)}
            >
              <option value="ALL">Todos os tipos</option>
              {canViewLinks ? <option value="LINK">Links</option> : null}
              {canViewSchedules ? <option value="SCHEDULE">Documentos</option> : null}
              {canViewNotes ? <option value="NOTE">Notas</option> : null}
            </AdminFilterSelect>
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
            <div className="fac-loading-state">Carregando favoritos...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="fac-empty-state">{emptyMessage}</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
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
