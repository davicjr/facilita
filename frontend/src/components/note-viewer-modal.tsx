'use client';

import Image from 'next/image';
import { FileText } from 'lucide-react';
import { LucideIconByName } from '@/components/admin/icon-picker';
import AdminModal from '@/components/admin/modal';
import { RichTextViewer } from '@/components/admin/rich-text-editor';
import ContentTypeSurface from '@/components/content-type-surface';
import { resolveAssetUrl } from '@/lib/image';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

type NoteViewerCategory = {
  name?: string | null;
  color?: string | null;
  icon?: string | null;
};

type NoteViewerData = Pick<Note, 'title' | 'content' | 'imageUrl' | 'color'> & {
  category?: NoteViewerCategory | null;
};

type NoteViewerModalProps = {
  note: NoteViewerData | null;
  open: boolean;
  onClose: () => void;
  panelClassName?: string;
};

export default function NoteViewerModal({
  note,
  open,
  onClose,
  panelClassName,
}: NoteViewerModalProps) {
  const hasImage = Boolean(note?.imageUrl);
  const hasContent = Boolean(note?.content?.trim());
  const accentColor = note?.category?.color || note?.color || '#3b82f6';
  const categoryIcon = note?.category?.icon;

  return (
    <AdminModal
      open={open}
      title={note?.title || 'Nota'}
      onClose={onClose}
      panelClassName={cn('max-w-4xl', panelClassName)}
    >
      <div
        className={cn(
          'grid gap-4',
          'md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:items-start',
        )}
      >
        <section className="rounded-[24px] border border-border/70 bg-white/75 p-3 shadow-[0_12px_30px_rgba(15,22,26,0.08)] dark:bg-card/82">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {hasImage ? 'Imagem' : 'Visual'}
          </p>

          {hasImage ? (
            <div
              className="flex aspect-square items-center justify-center overflow-hidden rounded-[20px] border p-4"
              style={{
                borderColor: `color-mix(in srgb, ${accentColor} 16%, var(--border) 84%)`,
                background: `radial-gradient(circle at top, color-mix(in srgb, ${accentColor} 10%, var(--popover) 90%) 0%, color-mix(in srgb, ${accentColor} 4%, var(--card) 96%) 58%, color-mix(in srgb, ${accentColor} 2%, var(--background) 98%) 100%)`,
              }}
            >
              <Image
                src={resolveAssetUrl(note?.imageUrl)}
                alt={note?.title || 'Nota'}
                width={720}
                height={720}
                unoptimized
                className="h-auto max-h-full w-auto max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="aspect-square overflow-hidden rounded-[20px] border"
              style={{
                borderColor: `color-mix(in srgb, ${accentColor} 24%, var(--border) 76%)`,
              }}
            >
              <ContentTypeSurface accentColor={accentColor}>
                {categoryIcon ? (
                  <LucideIconByName
                    name={categoryIcon}
                    size={40}
                    strokeWidth={2.1}
                    className="text-current"
                    style={{ color: accentColor }}
                  />
                ) : (
                  <FileText
                    size={40}
                    strokeWidth={2.1}
                    className="text-current"
                    style={{ color: accentColor }}
                  />
                )}
              </ContentTypeSurface>
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-border/70 bg-white/78 p-4 shadow-[0_12px_30px_rgba(15,22,26,0.08)] dark:bg-card/82">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Conteudo
          </p>

          {hasContent ? (
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <RichTextViewer
                content={note?.content || ''}
                className="[&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_p:first-child]:mt-0 [&_ul]:pl-5 [&_ol]:pl-5"
              />
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-[20px] border border-dashed border-border/70 bg-background/35 px-6 text-center text-[14px] text-muted-foreground">
              Nenhum conteudo disponivel para esta nota.
            </div>
          )}
        </section>
      </div>
    </AdminModal>
  );
}
