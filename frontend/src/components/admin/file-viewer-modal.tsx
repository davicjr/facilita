'use client';

import { downloadScheduleFile } from '@/lib/download';
import { resolveAssetUrl } from '@/lib/image';

interface FileViewerModalProps {
  open: boolean;
  scheduleId?: string;
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

const PREVIEWABLE = ['pdf'];

const FILE_META: Record<string, { label: string; color: string; icon: string }> = {
  pdf:  { label: 'PDF',        color: '#e53935', icon: 'pdf' },
  doc:  { label: 'Word',       color: '#1565c0', icon: 'word' },
  docx: { label: 'Word',       color: '#1565c0', icon: 'word' },
  xls:  { label: 'Excel',      color: '#2e7d32', icon: 'excel' },
  xlsx: { label: 'Excel',      color: '#2e7d32', icon: 'excel' },
  ppt:  { label: 'PowerPoint', color: '#e65100', icon: 'ppt' },
  pptx: { label: 'PowerPoint', color: '#e65100', icon: 'ppt' },
  txt:  { label: 'Texto',      color: '#546e7a', icon: 'text' },
  md:   { label: 'Markdown',   color: '#546e7a', icon: 'text' },
};

function FileTypeIcon({ ext, size = 48 }: { ext: string; size?: number }) {
  const meta = FILE_META[ext];
  const color = meta?.color ?? '#78909c';
  const label = meta?.label ?? ext.toUpperCase();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 68"
      width={size}
      height={Math.round(size * 68 / 56)}
      aria-hidden="true"
    >
      {/* Folha */}
      <path
        d="M6 0 h30 l14 14 v54 a6 6 0 0 1-6 6 H6 a6 6 0 0 1-6-6 V6 a6 6 0 0 1 6-6z"
        fill={color}
        opacity="0.12"
      />
      <path
        d="M6 0 h30 l14 14 v54 a6 6 0 0 1-6 6 H6 a6 6 0 0 1-6-6 V6 a6 6 0 0 1 6-6z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.5"
      />
      {/* Dobra */}
      <path d="M36 0 l14 14 H38 a2 2 0 0 1-2-2z" fill={color} opacity="0.35" />
      {/* Badge de tipo */}
      <rect x="4" y="28" width="48" height="22" rx="4" fill={color} />
      <text
        x="28"
        y="44"
        textAnchor="middle"
        fill="white"
        fontSize={label.length > 4 ? '8' : '10'}
        fontFamily="system-ui, sans-serif"
        fontWeight="700"
        letterSpacing="0.5"
      >
        {label}
      </text>
    </svg>
  );
}

export default function FileViewerModal({
  open,
  scheduleId,
  fileName,
  fileUrl,
  onClose,
}: FileViewerModalProps) {
  if (!open) return null;

  const ext = getExtension(fileName);
  const resolved = resolveAssetUrl(fileUrl);
  const canPreview = PREVIEWABLE.includes(ext);
  const meta = FILE_META[ext];

  const handleDownload = () => {
    if (scheduleId) {
      void downloadScheduleFile(scheduleId, fileName);
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = resolved;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-foreground/95 px-4 py-3 dark:bg-card/95">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon ext={ext} size={28} />
          <p className="truncate text-[14px] font-medium text-primary-foreground dark:text-foreground">
            {fileName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-4">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-[11px] uppercase tracking-[0.15em] text-primary-foreground hover:bg-white/20 dark:border-border dark:bg-secondary/60 dark:text-foreground dark:hover:bg-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20 dark:border-border dark:bg-secondary/60 dark:text-foreground"
            title="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {canPreview ? (
          <iframe src={resolved} className="h-full w-full border-0" title={fileName} />
        ) : (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-foreground/80 px-10 py-10 text-center dark:bg-card/80">
            <FileTypeIcon ext={ext} size={72} />
            <div>
              <p className="text-[15px] font-medium text-primary-foreground dark:text-foreground">
                Visualização não disponível
              </p>
              <p className="mt-1 text-[13px] text-primary-foreground/60 dark:text-muted-foreground">
                {meta
                  ? `Arquivos ${meta.label} não podem ser exibidos diretamente no navegador.`
                  : 'Este tipo de arquivo não pode ser exibido no navegador.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-[11px] uppercase tracking-[0.2em] text-primary-foreground hover:opacity-90"
            >
              Baixar arquivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
