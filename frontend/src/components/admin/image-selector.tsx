'use client';

import Image from 'next/image';
import { useState } from 'react';
import api from '@/lib/api';
import { resolveAssetUrl } from '@/lib/image';
import ImageGallery from './image-gallery';

interface ImageSelectorProps {
  value: string;
  onChange: (imageUrl: string) => void;
  disabled?: boolean;
  showPreview?: boolean;
}

type SelectorMode = 'upload' | 'gallery';

export default function ImageSelector({
  value,
  onChange,
  disabled = false,
  showPreview = true,
}: ImageSelectorProps) {
  const [mode, setMode] = useState<SelectorMode>('upload');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      setUploading(true);
      const response = await api.post('/uploads/image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipNotify: true,
      });
      onChange(response.data.url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          disabled={disabled}
          data-active={mode === 'upload' ? 'true' : 'false'}
          className="fac-tab border border-border"
        >
          Upload nova
        </button>
        <button
          type="button"
          onClick={() => setMode('gallery')}
          disabled={disabled}
          data-active={mode === 'gallery' ? 'true' : 'false'}
          className="fac-tab border border-border"
        >
          Escolher existente
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={disabled || uploading}
            className="fac-input !h-auto !px-3 !py-2 text-[14px]"
          />
          {uploading ? <p className="text-[12px] text-muted-foreground">Fazendo upload...</p> : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          disabled={disabled}
          className="fac-button-secondary w-full"
        >
          Abrir galeria
        </button>
      )}

      {showPreview && value ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <Image
            src={resolveAssetUrl(value)}
            alt="Imagem selecionada"
            width={640}
            height={160}
            unoptimized
            className="h-40 w-full object-cover"
          />
          <div className="p-2">
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={disabled}
              className="fac-button-secondary w-full !h-9 text-[10px]"
            >
              Remover imagem
            </button>
          </div>
        </div>
      ) : null}

      {galleryOpen ? (
        <ImageGallery
          onSelectImage={(imageUrl) => {
            onChange(imageUrl);
            setGalleryOpen(false);
          }}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
    </div>
  );
}

