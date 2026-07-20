'use client';

import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminFilterSelect from '@/components/admin/filter-select';
import RichTextEditor from '@/components/admin/rich-text-editor';
import ImageSelector from '@/components/admin/image-selector';
import AdminModal from '@/components/admin/modal';
import AdminNoteCard from '@/components/admin/note-card';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import ContentImagePositionControls from '@/components/admin/content-image-position-controls';
import ContentSharePanel from '@/components/admin/content-share-panel';
import ShareContentModal from '@/components/admin/share-content-modal';
import NoteViewerModal from '@/components/note-viewer-modal';
import useAdminContentCatalog from '@/hooks/use-admin-content-catalog';
import useClientPagination from '@/hooks/use-client-pagination';
import useContentForm from '@/hooks/use-content-form';
import { normalizeImagePosition, parseImagePosition } from '@/lib/image';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Note } from '@/types';

const emptyForm = {
  title: '',
  content: '',
  categoryId: '',
  color: '#3b82f6',
  imageUrl: '',
  imagePosition: '50% 50%',
  imageScale: 1,
};

type NoteForm = typeof emptyForm;
type NoteFormErrors = {
  title?: string;
  content?: string;
};

export default function NotesPage() {
  const user = useAuthStore((state) => state.user);

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewing, setViewing] = useState<Note | null>(null);

  const isSuperadmin = user?.role === 'SUPERADMIN';
  const canManageNotes = hasPermission(user, 'canManageNotes');
  const canManageShares = hasPermission(user, 'canManageShares');
  const userId = user?.id;

  const {
    items,
    categories,
    loading,
    error,
    load,
    toggleStatus,
    removeItem,
  } = useAdminContentCatalog<Note>({
    adminListPath: '/notes/admin/list',
    resourcePath: '/notes',
    errorMessage: 'Não foi possível carregar notas.',
    isSuperadmin,
    userId,
  });

  const {
    modalOpen,
    editing,
    form,
    setForm,
    formTab,
    setFormTab,
    saving,
    formErrors,
    touched,
    handleFieldBlur,
    clearFieldError,
    confirmTarget,
    setConfirmTarget,
    shareTarget,
    setShareTarget,
    removing,
    currentEditing,
    openCreate,
    openEdit,
    closeModal,
    save,
    remove,
  } = useContentForm<Note, NoteForm, NoteFormErrors>({
    items,
    loading,
    emptyForm,
    buildFormFromItem: (item) => ({
      title: item.title,
      content: item.content,
      categoryId: item.categoryId || '',
      color: item.color || '#3b82f6',
      imageUrl: item.imageUrl || '',
      imagePosition: normalizeImagePosition(item.imagePosition),
      imageScale: item.imageScale || 1,
    }),
    validate: (values) => {
      const errors: NoteFormErrors = {};
      if (!values.title.trim()) errors.title = 'Título é obrigatório.';
      if (!values.content.trim()) errors.content = 'Conteúdo é obrigatório.';
      return errors;
    },
    buildPayload: (values) => ({
      title: values.title,
      content: values.content,
      categoryId: values.categoryId || undefined,
      color: values.color || undefined,
      imageUrl: values.imageUrl || undefined,
      imagePosition: values.imageUrl ? values.imagePosition : undefined,
      imageScale: values.imageUrl ? values.imageScale : undefined,
    }),
    resourcePath: '/notes',
    canManage: canManageNotes,
    load,
    removeItem,
  });

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return items
      .filter((item) => (statusFilter === 'ALL' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!term) return true;
        return `${item.title} ${item.content}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [items, globalSearch, statusFilter]);

  const imagePosition = useMemo(() => parseImagePosition(form.imagePosition), [form.imagePosition]);
  const activeSearch = globalSearch.trim();

  const {
    containerRef: gridRef,
    pageItems: pagedNotes,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filtered);

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Notas"
          count={filtered.length}
          actionsClassName="sm:grid-cols-[180px_auto]"
          actions={
            <>
              <AdminFilterSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </AdminFilterSelect>

              <button
                type="button"
                className="fac-button-primary !h-10 !w-10 !rounded-full !px-0 !tracking-normal transition-colors duration-200 hover:!bg-accent hover:!text-accent-foreground"
                onClick={openCreate}
                aria-label="Nova nota"
                title="Nova nota"
                disabled={!canManageNotes}
              >
                <span className="text-[22px] leading-none">+</span>
              </button>
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

          {loading ? (
            <div className="fac-loading-state">Carregando notas...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="fac-empty-state">Nenhuma nota encontrada.</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
                {pagedNotes.map((item) => (
                  <AdminNoteCard
                    key={item.id}
                    note={item}
                    onEdit={canManageNotes ? () => openEdit(item) : undefined}
                    onShare={
                      canManageShares && item.ownerId === user?.id
                        ? () => {
                            setShareTarget(item);
                          }
                        : undefined
                    }
                    onToggleStatus={
                      canManageNotes
                        ? () => {
                            void toggleStatus(item);
                          }
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

      <AdminModal
        open={modalOpen}
        title={editing ? 'Editar nota' : 'Nova nota'}
        description="Crie notas pessoais ou compartilhadas."
        onClose={closeModal}
        panelClassName="max-w-[820px]"
        footer={
          <>
            {editing && canManageNotes ? (
              <button
                type="button"
                className="fac-button-secondary text-[11px]"
                onClick={() => {
                  if (editing) {
                    setConfirmTarget(editing);
                  }
                }}
                disabled={saving || removing}
              >
                Remover
              </button>
            ) : null}
            <button
              type="button"
              className="fac-button-secondary text-[11px]"
              onClick={closeModal}
              disabled={saving || removing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="fac-button-primary text-[11px]"
              onClick={save}
              disabled={saving || removing || !canManageNotes || !form.title.trim() || !form.content.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="fac-tabs !grid-cols-2">
          <button
            type="button"
            className="fac-tab"
            data-active={formTab === 'BASIC' ? 'true' : 'false'}
            onClick={() => setFormTab('BASIC')}
          >
            Básico
          </button>
          <button
            type="button"
            className="fac-tab"
            data-active={formTab === 'VISUAL' ? 'true' : 'false'}
            onClick={() => setFormTab('VISUAL')}
          >
            Visual
          </button>
        </div>

        {formTab === 'BASIC' ? (
          <section className="fac-form-card mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="fac-label" htmlFor="note-title">Título</label>
                <input
                  id="note-title"
                  value={form.title}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, title: event.target.value }));
                    clearFieldError('title');
                  }}
                  onBlur={() => handleFieldBlur('title')}
                  className={`fac-input ${touched.title && formErrors.title ? 'border-destructive' : ''}`}
                />
                {touched.title && formErrors.title ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.title}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="fac-label" id="note-content-label">Conteúdo</label>
                <RichTextEditor
                  ariaLabelledBy="note-content-label"
                  value={form.content}
                  onChange={(html) => {
                    setForm((prev) => ({ ...prev, content: html }));
                    clearFieldError('content');
                  }}
                  hasError={Boolean(touched.content && formErrors.content)}
                  disabled={saving}
                />
                {touched.content && formErrors.content ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.content}</p>
                ) : null}
              </div>

              <div>
                <label className="fac-label" htmlFor="note-category">Categoria</label>
                <select
                  id="note-category"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, categoryId: event.target.value }))
                  }
                  className="fac-select"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {canManageShares && !isSuperadmin ? (
                <ContentSharePanel
                  currentEditing={currentEditing}
                  unsavedMessage="Salve a nota para compartilhar com usuários específicos."
                  unsavedPreviewMessage="Disponível apenas depois que a nota for salva."
                  disabled={saving || removing}
                  onShare={() => {
                    if (currentEditing) {
                      setShareTarget(currentEditing);
                    }
                  }}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {formTab === 'VISUAL' ? (
          <div className="mt-4 space-y-4">
            <section className="fac-form-card">
              <label className="fac-label">Imagem</label>
              <ImageSelector
                value={form.imageUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
                showPreview={false}
              />
              <p className="mt-1 text-[12px] text-muted-foreground">Opcional</p>
            </section>

            <section className="fac-form-card">
              <p className="fac-form-title">Prévia do card</p>
              <div
                className={
                  form.imageUrl
                    ? 'mt-4 grid gap-6 md:grid-cols-[minmax(0,248px)_minmax(0,1fr)] md:items-center'
                    : 'mt-4'
                }
              >
                <div className="flex justify-center md:justify-start">
                  <AdminNoteCard
                    size="preview"
                    note={{
                      title: form.title || 'Nome da nota',
                      content: form.content || 'Conteúdo da nota',
                      category:
                        categories.find((category) => category.id === form.categoryId) ?? null,
                      status: 'ACTIVE',
                      imageUrl: form.imageUrl || undefined,
                      imagePosition: form.imagePosition,
                      imageScale: form.imageScale,
                      color: form.color,
                      shareCount: 0,
                    }}
                    previewAction={
                      <button
                        type="button"
                        className="rounded-lg border border-border bg-white/80 px-3 py-1 text-[13px] uppercase tracking-[0.12em]"
                        onClick={() => {
                          const previewCategory =
                            categories.find((category) => category.id === form.categoryId) ?? null;
                          setViewing({
                            ...form,
                            id: 'preview',
                            ownerId: user?.id || '',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            status: 'ACTIVE',
                            category: previewCategory,
                          } as Note);
                        }}
                      >
                        Ver
                      </button>
                    }
                  />
                </div>

                {form.imageUrl ? (
                  <ContentImagePositionControls
                    x={imagePosition.x}
                    y={imagePosition.y}
                    scale={form.imageScale}
                    onPositionChange={(x, y) =>
                      setForm((prev) => ({ ...prev, imagePosition: `${x}% ${y}%` }))
                    }
                    onScaleChange={(scale) => setForm((prev) => ({ ...prev, imageScale: scale }))}
                  />
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </AdminModal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Remover nota"
        description={
          confirmTarget
            ? `Confirma a remoção permanente da nota "${confirmTarget.title}"?`
            : 'Confirma a remoção permanente desta nota?'
        }
        confirmLabel="Remover nota"
        loading={removing}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirmTarget(null)}
      />

      <ShareContentModal
        open={Boolean(shareTarget)}
        entityType="NOTE"
        entityId={shareTarget?.id ?? null}
        entityTitle={shareTarget?.title || 'Nota'}
        onClose={() => setShareTarget(null)}
        onShared={load}
      />

      <NoteViewerModal
        open={Boolean(viewing)}
        note={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
