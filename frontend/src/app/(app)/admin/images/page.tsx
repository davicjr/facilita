'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminFilterSelect from '@/components/admin/filter-select';
import AdminImageCard from '@/components/admin/image-card';
import AdminModal from '@/components/admin/modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import TagInput from '@/components/admin/tag-input';
import { useImageGallery } from '@/hooks/useImageGallery';
import api, { serverURL } from '@/lib/api';
import { formatBytes } from '@/lib/format';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { UploadedImage } from '@/types';

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export default function ImagesPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const canManageImages = hasPermission(user, 'canManageImages');

  const [ownerFilter, setOwnerFilter] = useState<'ALL' | 'MINE'>('ALL');
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search: globalSearch || undefined,
      uploadedBy: ownerFilter === 'MINE' ? user?.id : undefined,
    }),
    [globalSearch, ownerFilter, user?.id],
  );

  const {
    images,
    loading,
    error,
    page,
    totalPages,
    total,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    refresh,
  } = useImageGallery(filters);

  const handleDelete = async () => {
    if (!selectedImage) return;
    if (!canManageImages) return;

    setIsDeleting(true);
    try {
      await api.delete(`/uploads/images/${selectedImage.id}`);
      setSelectedImage(null);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      await refresh();
    }
  };

  const loadImageDetails = async (imageId: string) => {
    const response = await api.get<UploadedImage>(`/uploads/images/${imageId}`, {
      skipNotify: true,
    });
    setSelectedImage(response.data);
    setEditAlt(response.data.alt || '');
    setEditTags(response.data.tags || []);
  };

  const handleSaveMeta = async () => {
    if (!selectedImage) return;
    if (!canManageImages) return;
    setIsSaving(true);
    try {
      await api.patch(`/uploads/images/${selectedImage.id}`, {
        alt: editAlt || null,
        tags: editTags,
      });
      setSelectedImage((prev) => prev ? { ...prev, alt: editAlt, tags: editTags } : prev);
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasHydrated) {
    return <div className="fac-loading-state">Carregando imagens...</div>;
  }

  const activeSearch = globalSearch.trim();
  const selectedImageOwner = selectedImage?.user?.name || 'Usuário';
  const selectedImageDimensions = selectedImage?.width && selectedImage?.height
    ? `${selectedImage.width} x ${selectedImage.height}`
    : 'Não informado';
  const selectedImageMeta = selectedImage
    ? [
        { label: 'Tamanho', value: formatBytes(selectedImage.size, 1) },
        selectedImage.width && selectedImage.height
          ? { label: 'Dimensões', value: selectedImageDimensions }
          : null,
        { label: 'Uso', value: `${selectedImage.usageCount ?? 0} conteúdo(s)` },
      ].filter((item): item is { label: string; value: string } => item !== null)
    : [];

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Galeria"
          count={total}
          actionsClassName="sm:max-w-[220px] xl:w-[220px]"
          actions={
            <AdminFilterSelect
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value as 'ALL' | 'MINE')}
            >
              <option value="ALL">Todas as imagens</option>
              <option value="MINE">Minhas imagens</option>
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

          {loading ? (
            <div className="fac-loading-state">Carregando imagens...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : images.length === 0 ? (
            <div className="fac-empty-state">Nenhuma imagem encontrada.</div>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              {images.map((image) => (
                <AdminImageCard
                  key={image.id}
                  image={image}
                  displayMode="imageOnly"
                  onOpen={() => void loadImageDetails(image.id)}
                />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPrevious={previousPage}
            onNext={nextPage}
          />
        </div>
      </section>

      <AdminModal
        open={Boolean(selectedImage)}
        title="Detalhes da imagem"
        description={
          selectedImage
            ? `Enviado por ${selectedImageOwner} em ${formatDate(selectedImage.createdAt)}`
            : undefined
        }
        onClose={() => setSelectedImage(null)}
        panelClassName="max-w-[780px]"
        footer={
          selectedImage ? (
            <button
              type="button"
              className="fac-button-secondary text-[11px] !border-destructive/40 !bg-destructive/5 !text-destructive hover:!bg-destructive/10"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting || isSaving || !canManageImages}
            >
              {isDeleting ? 'Removendo...' : 'Remover imagem'}
            </button>
          ) : null
        }
      >
        {selectedImage ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <section className="fac-form-card space-y-3">
              <p className="fac-label">Preview</p>

              <div className="flex items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted/20 p-4">
                <div className="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[16px] bg-white/85 p-4 shadow-[inset_0_0_0_1px_rgba(15,22,26,0.04)] dark:bg-card/85">
                  <Image
                    src={`${serverURL}${selectedImage.url}`}
                    alt={selectedImage.alt || selectedImage.originalName}
                    width={selectedImage.width ?? 1200}
                    height={selectedImage.height ?? 900}
                    unoptimized
                    className="h-auto max-h-[280px] w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            </section>

            <section className="fac-form-card space-y-4">
              <div className="space-y-1 border-b border-border/70 pb-4">
                <p className="fac-label">Arquivo</p>
                <p className="break-words text-[15px] font-medium text-foreground">
                  {selectedImage.originalName}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {selectedImageMeta.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[14px] border border-border bg-white/55 px-3 py-2 dark:bg-secondary/55"
                  >
                    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[13px] text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="fac-label">Texto alternativo</label>
                  <input
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="fac-input"
                    placeholder="Descreva a imagem..."
                    disabled={isSaving || !canManageImages}
                  />
                </div>

                <div>
                  <label className="fac-label">Tags</label>
                  <TagInput
                    value={editTags}
                    onChange={setEditTags}
                    placeholder="Digite e pressione Enter ou vírgula..."
                    disabled={isSaving || !canManageImages}
                  />
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Use tags para facilitar a busca de imagens.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  className="fac-button-primary text-[11px]"
                  onClick={() => void handleSaveMeta()}
                  disabled={isSaving || !canManageImages}
                >
                  {isSaving ? 'Salvando...' : 'Salvar metadados'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </AdminModal>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Remover imagem"
        description={
          selectedImage
            ? `Confirma a remoção permanente da imagem "${selectedImage.originalName}"?`
            : 'Confirma a remoção permanente desta imagem?'
        }
        confirmLabel="Remover imagem"
        loading={isDeleting}
        onConfirm={() => {
          void handleDelete();
        }}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
