'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useImageGallery } from '@/hooks/useImageGallery';
import { serverURL } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface ImageGalleryProps {
  onSelectImage: (imageUrl: string) => void;
  onClose: () => void;
}

export default function ImageGallery({
  onSelectImage,
  onClose,
}: ImageGalleryProps) {
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      uploadedBy: showOnlyMine ? user?.id : undefined,
    }),
    [search, showOnlyMine, user?.id],
  );

  const {
    images,
    loading,
    error,
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
  } = useImageGallery(filters);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const modalMarkup = (
    <div
      className="fac-modal-root px-4 py-6"
      data-state="open"
    >
      <button
        type="button"
        onClick={onClose}
        className="fac-modal-backdrop"
        aria-label="Fechar galeria"
      />
      <div
        className="fac-modal-panel relative flex max-h-[90vh] w-full !max-w-5xl flex-col overflow-hidden p-4 sm:p-6"
        data-state="open"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Galeria de Imagens
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Selecione uma imagem já carregada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="motion-press rounded-lg border border-border/70 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground"
          >
            Fechar
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1 rounded-lg border border-border/70 bg-background px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyMine}
              onChange={(event) => setShowOnlyMine(event.target.checked)}
              className="rounded"
            />
            <span>Minhas imagens</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                Nenhuma imagem encontrada
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => {
                    onSelectImage(image.url);
                    onClose();
                  }}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted transition-colors hover:border-foreground/30"
                >
                  <Image
                    src={`${serverURL}${image.url}`}
                    alt={image.alt || image.originalName}
                    width={image.width ?? 440}
                    height={image.height ?? 440}
                    unoptimized
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="truncate text-xs font-medium text-white">
                        {image.originalName}
                      </p>
                      <p className="text-[10px] text-white/70">
                        {formatBytes(image.size)} - {formatDate(image.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/70 pt-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={previousPage}
                disabled={!hasPreviousPage}
                className="motion-press rounded-lg border border-border/70 px-3 py-2 text-[11px] uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={nextPage}
                disabled={!hasNextPage}
                className="motion-press rounded-lg border border-border/70 px-3 py-2 text-[11px] uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;

  return createPortal(modalMarkup, document.body);
}
