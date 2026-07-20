'use client';

import { useRef, useState } from 'react';

interface FileDropzoneProps {
  id?: string;
  fileName?: string;
  fileSize?: number;
  uploading?: boolean;
  hasError?: boolean;
  accept?: string;
  hint?: string;
  onFile: (file: File) => void;
  onClear?: () => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropzone({
  id,
  fileName,
  fileSize,
  uploading = false,
  hasError = false,
  accept,
  hint,
  onFile,
  onClear,
  disabled = false,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const hasFile = Boolean(fileName);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFile(file);
      e.target.value = '';
    }
  };

  const borderColor = hasError
    ? 'border-destructive'
    : dragging
      ? 'border-primary bg-primary/5'
      : hasFile
        ? 'border-border bg-muted/30'
        : 'border-border bg-white/50 dark:bg-card/40';

  return (
    <div className="space-y-1.5">
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors duration-150 ${borderColor} ${disabled || uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !hasFile && inputRef.current?.click()}
      >
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleChange}
          disabled={disabled || uploading}
        />

        {!hasFile && !uploading && (
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-muted-foreground/60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <p className="text-[13px] font-medium text-foreground">
              {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
            </p>
            {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
          </div>
        )}

        {uploading && (
          <div className="flex flex-col items-center gap-2 px-4 py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-[13px] text-muted-foreground">Enviando arquivo...</p>
          </div>
        )}

        {hasFile && !uploading && (
          <div className="flex items-center gap-3 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 shrink-0 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{fileName}</p>
              {fileSize ? (
                <p className="text-[12px] text-muted-foreground">{formatBytes(fileSize)}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="fac-button-secondary !h-7 !px-2.5 !text-[11px]"
                title="Substituir arquivo"
              >
                Trocar
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="fac-button-secondary !h-7 !px-2.5 !text-[11px] hover:!border-destructive hover:!text-destructive"
                  title="Remover arquivo"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
