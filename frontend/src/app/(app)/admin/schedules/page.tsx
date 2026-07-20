'use client';

import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import FileDropzone from '@/components/admin/file-dropzone';
import AdminFilterSelect from '@/components/admin/filter-select';
import ImageSelector from '@/components/admin/image-selector';
import AdminModal from '@/components/admin/modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import AdminScheduleCard from '@/components/admin/schedule-card';
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
import { UploadedSchedule } from '@/types';

const emptyForm = {
  title: '',
  categoryId: '',
  fileUrl: '',
  fileName: '',
  fileSize: 0,
  imageUrl: '',
  imagePosition: '50% 50%',
  imageScale: 1,
};

type ScheduleForm = typeof emptyForm;
type ScheduleFormErrors = {
  title?: string;
  fileUrl?: string;
};

export default function SchedulesPage() {
  const user = useAuthStore((state) => state.user);

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [uploading, setUploading] = useState(false);

  const isSuperadmin = user?.role === 'SUPERADMIN';
  const canManageSchedules = hasPermission(user, 'canManageSchedules');
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
  } = useAdminContentCatalog<UploadedSchedule>({
    adminListPath: '/schedules/admin/list',
    resourcePath: '/schedules',
    errorMessage: 'Não foi possível carregar documentos.',
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
  } = useContentForm<UploadedSchedule, ScheduleForm, ScheduleFormErrors>({
    items,
    loading,
    emptyForm,
    buildFormFromItem: (item) => ({
      title: item.title,
      categoryId: item.categoryId || '',
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      fileSize: item.fileSize,
      imageUrl: item.imageUrl || '',
      imagePosition: normalizeImagePosition(item.imagePosition),
      imageScale: item.imageScale || 1,
    }),
    validate: (values) => {
      const errors: ScheduleFormErrors = {};
      if (!values.title.trim()) errors.title = 'Título é obrigatório.';
      if (!values.fileUrl) errors.fileUrl = 'Arquivo é obrigatório.';
      return errors;
    },
    buildPayload: (values) => ({
      title: values.title,
      categoryId: values.categoryId || undefined,
      fileUrl: values.fileUrl,
      fileName: values.fileName,
      fileSize: values.fileSize,
      imageUrl: values.imageUrl || undefined,
      imagePosition: values.imageUrl ? values.imagePosition : undefined,
      imageScale: values.imageUrl ? values.imageScale : undefined,
    }),
    resourcePath: '/schedules',
    canManage: canManageSchedules,
    load,
    removeItem,
  });

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return items
      .filter((item) => (statusFilter === 'ALL' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!term) return true;
        return `${item.title} ${item.fileName}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [items, globalSearch, statusFilter]);

  const imagePosition = useMemo(() => parseImagePosition(form.imagePosition), [form.imagePosition]);
  const activeSearch = globalSearch.trim();

  const {
    containerRef: gridRef,
    pageItems: pagedSchedules,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filtered);

  const uploadDocument = async (file: File) => {
    if (!canManageSchedules) {
      return;
    }

    const body = new FormData();
    body.append('file', file);

    setUploading(true);
    try {
      const response = await api.post('/uploads/document', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipNotify: true,
      });

      setForm((prev) => ({
        ...prev,
        fileUrl: response.data.url,
        fileName: response.data.originalName,
        fileSize: response.data.size,
      }));
      clearFieldError('fileUrl');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Documentos"
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
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </AdminFilterSelect>

              <button
                type="button"
                className="fac-button-primary !h-10 !w-10 !rounded-full !px-0 !tracking-normal transition-colors duration-200 hover:!bg-accent hover:!text-accent-foreground"
                onClick={openCreate}
                aria-label="Novo documento"
                title="Novo documento"
                disabled={!canManageSchedules}
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
            <div className="fac-loading-state">Carregando documentos...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="fac-empty-state">Nenhum documento encontrado.</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
                {pagedSchedules.map((item) => (
                  <AdminScheduleCard
                    key={item.id}
                    schedule={item}
                    onEdit={canManageSchedules ? () => openEdit(item) : undefined}
                    onShare={
                      canManageShares && item.ownerId === user?.id
                        ? () => {
                            setShareTarget(item);
                          }
                        : undefined
                    }
                    onToggleStatus={
                      canManageSchedules
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
        title={editing ? 'Editar documento' : 'Novo documento'}
        description="Adicione arquivos para consulta no portal."
        onClose={closeModal}
        panelClassName="max-w-[820px]"
        footer={
          <>
            {editing && canManageSchedules ? (
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
              disabled={saving || removing || !canManageSchedules || !form.title.trim() || !form.fileUrl}
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
                <label className="fac-label" htmlFor="schedule-title">Título</label>
                <input
                  id="schedule-title"
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
                <label className="fac-label" htmlFor="schedule-file">Arquivo</label>
                <FileDropzone
                  id="schedule-file"
                  fileName={form.fileName}
                  fileSize={form.fileSize}
                  uploading={uploading}
                  hasError={Boolean(touched.fileUrl && formErrors.fileUrl)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                  hint="PDF, DOC, XLS/XLSX, PPT, TXT ou MD"
                  onFile={(file) => { void uploadDocument(file); }}
                  onClear={() => {
                    setForm((prev) => ({ ...prev, fileUrl: '', fileName: '', fileSize: 0 }));
                    handleFieldBlur('fileUrl');
                  }}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Arquivos <span className="font-medium text-foreground">PDF</span> serão exibidos diretamente no visualizador. Outros formatos estarão disponíveis para download.
                </p>
                {touched.fileUrl && formErrors.fileUrl ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.fileUrl}</p>
                ) : null}
              </div>

              <div>
                <label className="fac-label" htmlFor="schedule-category">Categoria</label>
                <select
                  id="schedule-category"
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
                  unsavedMessage="Salve o documento para compartilhar com usuários específicos."
                  unsavedPreviewMessage="Disponível apenas depois que o documento for salvo."
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
                  <AdminScheduleCard
                    size="preview"
                    schedule={{
                      title: form.title || 'Nome do documento',
                      category:
                        categories.find((category) => category.id === form.categoryId) ?? null,
                      status: 'ACTIVE',
                      imageUrl: form.imageUrl || undefined,
                      imagePosition: form.imagePosition,
                      imageScale: form.imageScale,
                      shareCount: 0,
                      color: null,
                    }}
                    previewAction={
                      <span className="rounded-lg border border-border bg-white/80 px-3 py-1 text-[13px] uppercase tracking-[0.12em]">
                        DOC
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
        title="Remover documento"
        description={
          confirmTarget
            ? `Confirma a remoção permanente do documento "${confirmTarget.title}"?`
            : 'Confirma a remoção permanente deste documento?'
        }
        confirmLabel="Remover documento"
        loading={removing}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirmTarget(null)}
      />

      <ShareContentModal
        open={Boolean(shareTarget)}
        entityType="SCHEDULE"
        entityId={shareTarget?.id ?? null}
        entityTitle={shareTarget?.title || 'Documento'}
        onClose={() => setShareTarget(null)}
        onShared={load}
      />
    </div>
  );
}
