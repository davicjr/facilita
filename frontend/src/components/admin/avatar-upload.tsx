'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import api, { serverURL } from '@/lib/api';

interface AvatarUploadProps {
  value: string;
  onChange: (url: string) => void;
  name?: string;
  disabled?: boolean;
}

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${serverURL}${url}`;
}

function Initials({ name }: { name?: string }) {
  const letters = (name || '?')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[22px] font-semibold text-primary select-none">
      {letters}
    </div>
  );
}

export default function AvatarUpload({
  value,
  onChange,
  name,
  disabled = false,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);

    setUploading(true);
    try {
      const response = await api.post('/uploads/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipNotify: true,
      });
      onChange(response.data.url);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
      e.target.value = '';
    }
  };

  const resolved = resolveUrl(value);

  return (
    <div className="flex items-center gap-5">
      {/* Avatar circular */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted">
        {resolved ? (
          <Image
            src={resolved}
            alt={name || 'Avatar'}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <Initials name={name} />
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="space-y-2.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleChange}
          disabled={disabled || uploading}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="fac-button-secondary !h-9 !px-4 !text-[11px] disabled:opacity-60"
          >
            {uploading ? 'Enviando...' : resolved ? 'Trocar foto' : 'Enviar foto'}
          </button>

          {resolved && !uploading && (
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={disabled}
              className="fac-button-ghost !h-9 !px-4 !text-[11px] !text-destructive hover:!border-destructive/40 hover:!bg-destructive/5"
            >
              Remover
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">JPG, PNG ou WebP. Máx. 5 MB.</p>
      </div>
    </div>
  );
}
