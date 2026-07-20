'use client';

import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminFilterSelect from '@/components/admin/filter-select';
import SortableLinkList from '@/components/admin/sortable-link-list';
import ImageSelector from '@/components/admin/image-selector';
import AdminLinkCard from '@/components/admin/link-card';
import AdminModal from '@/components/admin/modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import ContentImagePositionControls from '@/components/admin/content-image-position-controls';
import ContentSharePanel from '@/components/admin/content-share-panel';
import ShareContentModal from '@/components/admin/share-content-modal';
import useAdminContentCatalog from '@/hooks/use-admin-content-catalog';
import useClientPagination from '@/hooks/use-client-pagination';
import useContentForm from '@/hooks/use-content-form';
import api from '@/lib/api';
import { normalizeImagePosition, parseImagePosition } from '@/lib/image';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Link } from '@/types';

const emptyForm = {
  title: '',
  url: '',
  description: '',
  categoryId: '',
  color: '#3b82f6',
  imageUrl: '',
  imagePosition: '50% 50%',
  imageScale: 1,
  order: 0,
};

type LinkForm = typeof emptyForm;
type LinkFormErrors = {
  title?: string;
  url?: string;
};

export default function LinksPage() {
  const user = useAuthStore((state) => state.user);

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortMode, setSortMode] = useState(false);

  const isSuperadmin = user?.role === 'SUPERADMIN';
  const canManageLinks = hasPermission(user, 'canManageLinks');
  const canManageShares = hasPermission(user, 'canManageShares');
  const userId = user?.id;

  const {
    items: links,
    categories,
    loading,
    error,
    load,
    toggleStatus,
    removeItem,
  } = useAdminContentCatalog<Link>({
    adminListPath: '/links/admin/list',
    resourcePath: '/links',
    errorMessage: 'Não foi possível carregar links.',
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
  } = useContentForm<Link, LinkForm, LinkFormErrors>({
    items: links,
    loading,
    emptyForm,
    buildFormFromItem: (link) => ({
      title: link.title,
      url: link.url,
      description: link.description || '',
      categoryId: link.categoryId || '',
      color: link.color || '#3b82f6',
      imageUrl: link.imageUrl || '',
      imagePosition: normalizeImagePosition(link.imagePosition),
      imageScale: link.imageScale || 1,
      order: link.order,
    }),
    validate: (values) => {
      const errors: LinkFormErrors = {};
      if (!values.title.trim()) errors.title = 'Título é obrigatório.';
      if (!values.url.trim()) errors.url = 'URL é obrigatória.';
      return errors;
    },
    buildPayload: (values) => ({
      title: values.title,
      url: values.url,
      description: values.description || undefined,
      categoryId: values.categoryId || undefined,
      color: values.color || undefined,
      imageUrl: values.imageUrl || undefined,
      imagePosition: values.imageUrl ? values.imagePosition : undefined,
      imageScale: values.imageUrl ? values.imageScale : undefined,
      order: values.order,
    }),
    resourcePath: '/links',
    canManage: canManageLinks,
    load,
    removeItem,
  });

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return links
      .filter((link) => (statusFilter === 'ALL' ? true : link.status === statusFilter))
      .filter((link) => {
        if (!term) return true;
        return `${link.title} ${link.description || ''} ${link.url}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [links, globalSearch, statusFilter]);

  const imagePosition = useMemo(() => parseImagePosition(form.imagePosition), [form.imagePosition]);
  const activeSearch = globalSearch.trim();

  const {
    containerRef: gridRef,
    pageItems: pagedLinks,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filtered);

  const saveOrder = async (orderedIds: string[]) => {
    if (!canManageLinks) return;
    await Promise.all(
      orderedIds.map((id, index) => api.patch(`/links/${id}`, { order: index })),
    );
    setSortMode(false);
    await load();
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Links"
          count={filtered.length}
          actionsClassName="sm:grid-cols-[180px_auto_auto]"
          actions={
            <>
              <AdminFilterSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </AdminFilterSelect>

              {canManageLinks && !sortMode && filtered.length > 1 && (
                <button
                  type="button"
                  className="fac-button-secondary !h-10 !px-4 !text-[11px]"
                  onClick={() => setSortMode(true)}
                  title="Reordenar links"
                >
                  Reordenar
                </button>
              )}

              <button
                type="button"
                className="fac-button-primary !h-10 !w-10 !rounded-full !px-0 !tracking-normal transition-colors duration-200 hover:!bg-accent hover:!text-accent-foreground"
                onClick={openCreate}
                aria-label="Novo link"
                title="Novo link"
                disabled={!canManageLinks}
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
            <div className="fac-loading-state">Carregando links...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="fac-empty-state">Nenhum link encontrado.</div>
          ) : sortMode ? (
            <SortableLinkList
              links={filtered}
              onSave={(ids) => saveOrder(ids)}
              onCancel={() => setSortMode(false)}
            />
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
                {pagedLinks.map((link) => (
                  <AdminLinkCard
                    key={link.id}
                    link={link}
                    onEdit={canManageLinks ? () => openEdit(link) : undefined}
                    onShare={
                      canManageShares && link.ownerId === user?.id
                        ? () => {
                            setShareTarget(link);
                          }
                        : undefined
                    }
                    onToggleStatus={
                      canManageLinks
                        ? () => {
                            void toggleStatus(link);
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
        title={editing ? 'Editar link' : 'Novo link'}
        description="Atualize os principais dados do link."
        onClose={closeModal}
        panelClassName="max-w-[820px]"
        footer={
          <>
            {editing && canManageLinks ? (
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
              disabled={saving || removing || !canManageLinks || !form.title.trim() || !form.url.trim()}
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
                <label className="fac-label" htmlFor="link-title">Título</label>
                <input
                  id="link-title"
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
                <label className="fac-label" htmlFor="link-url">URL</label>
                <input
                  id="link-url"
                  value={form.url}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, url: event.target.value }));
                    clearFieldError('url');
                  }}
                  onBlur={() => handleFieldBlur('url')}
                  className={`fac-input ${touched.url && formErrors.url ? 'border-destructive' : ''}`}
                  placeholder="https://exemplo.com"
                />
                {touched.url && formErrors.url ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.url}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="fac-label" htmlFor="link-description">Descrição</label>
                <textarea
                  id="link-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  className="fac-textarea"
                  rows={4}
                />
                <p className="mt-1 text-[12px] text-muted-foreground">Opcional</p>
              </div>

              <div>
                <label className="fac-label" htmlFor="link-category">Categoria</label>
                <select
                  id="link-category"
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
                  unsavedMessage="Salve o link para compartilhar com usuários específicos."
                  unsavedPreviewMessage="Disponível apenas depois que o link for salvo."
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
                  <AdminLinkCard
                    size="preview"
                    link={{
                      title: form.title || 'Nome do link',
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
                      <span className="rounded-lg border border-border bg-white/80 px-3 py-1 text-[13px] uppercase tracking-[0.12em]">
                        LINK
                      </span>
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
        title="Remover link"
        description={
          confirmTarget
            ? `Confirma a remoção permanente do link "${confirmTarget.title}"?`
            : 'Confirma a remoção permanente deste link?'
        }
        confirmLabel="Remover link"
        loading={removing}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirmTarget(null)}
      />

      <ShareContentModal
        open={Boolean(shareTarget)}
        entityType="LINK"
        entityId={shareTarget?.id ?? null}
        entityTitle={shareTarget?.title || 'Link'}
        onClose={() => setShareTarget(null)}
        onShared={load}
      />
    </div>
  );
}
