'use client';

import { FileText, Share2 } from 'lucide-react';
import { type ReactNode } from 'react';
import ContentCoverImage from '@/components/content-cover-image';
import ContentTypeSurface from '@/components/content-type-surface';
import { getContentTypeColor } from '@/lib/content-type';
import { cn } from '@/lib/utils';
import type { UploadedSchedule } from '@/types';
import AdminEntityCard from './entity-card';

type AdminScheduleCardProps = {
  schedule: Pick<
    UploadedSchedule,
    | 'title'
    | 'category'
    | 'status'
    | 'imageUrl'
    | 'imagePosition'
    | 'imageScale'
    | 'color'
    | 'shareCount'
  >;
  onEdit?: () => void;
  onShare?: () => void;
  onToggleStatus?: () => void;
  previewAction?: ReactNode;
  size?: 'default' | 'preview';
};

export default function AdminScheduleCard({
  schedule,
  onEdit,
  onShare,
  onToggleStatus,
  previewAction,
  size = 'default',
}: AdminScheduleCardProps) {
  const isPreview = size === 'preview';
  const coverWidth = isPreview ? 520 : 440;
  const coverHeight = isPreview ? 360 : 320;
  const coverClassName = isPreview ? 'h-44' : undefined;
  const contentClassName = isPreview ? 'px-4 py-3' : undefined;
  const cardClassName = cn(
    isPreview ? 'w-[248px]' : undefined,
    schedule.status === 'INACTIVE' ? 'opacity-80 grayscale' : undefined,
  );
  const dividerColor = getContentTypeColor('SCHEDULE');
  const accentColor = schedule.color || schedule.category?.color || dividerColor;
  const categoryLabel = schedule.category?.name || 'Sem categoria';
  const hasImage = Boolean(schedule.imageUrl);

  const cover = (
    <div className="absolute inset-0">
      {hasImage ? (
        <ContentCoverImage
          src={schedule.imageUrl}
          alt={schedule.title}
          position={schedule.imagePosition}
          scale={schedule.imageScale}
          width={coverWidth}
          height={coverHeight}
        />
      ) : (
        <ContentTypeSurface accentColor={accentColor} icon={FileText} />
      )}
      {hasImage ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      ) : null}
    </div>
  );

  const coverOverlay = onShare ? (
    <button
      type="button"
      aria-label={`Compartilhar ${schedule.title}`}
      title={schedule.shareCount ? `Compartilhado com ${schedule.shareCount}` : 'Compartilhar'}
      className={cn(
        'fac-button-secondary !h-9 !w-9 !px-0 !bg-white/92 shadow-[0_6px_14px_rgba(15,22,26,0.18)] backdrop-blur',
        schedule.shareCount
          ? '!border-emerald-500/20 !bg-emerald-400/95 !text-white hover:!bg-emerald-400 dark:!bg-emerald-400/90 dark:!text-white'
          : undefined,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onShare();
      }}
    >
      <Share2 className="size-4" aria-hidden="true" />
    </button>
  ) : null;

  const details = (
    <p className="break-words text-[14px] font-semibold leading-snug text-foreground">{schedule.title}</p>
  );

  const controls: ReactNode = previewAction
    ? previewAction
    : onToggleStatus
      ? (
          <button
            type="button"
            role="switch"
            aria-checked={schedule.status === 'ACTIVE'}
            aria-label={schedule.status === 'ACTIVE' ? `Desativar ${schedule.title}` : `Ativar ${schedule.title}`}
            className="fac-toggle shrink-0"
            data-state={schedule.status === 'ACTIVE' ? 'on' : 'off'}
            onClick={onToggleStatus}
          >
            <span className="fac-toggle-dot" />
          </button>
        )
      : null;

  const trailing = (
    <div className="flex w-full items-center justify-between gap-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{categoryLabel}</p>
      {controls}
    </div>
  );

  return (
    <AdminEntityCard
      cover={cover}
      coverOverlay={coverOverlay}
      details={details}
      trailing={trailing}
      onOpen={onEdit}
      className={cardClassName}
      coverClassName={coverClassName}
      contentClassName={contentClassName}
      dividerColor={dividerColor}
    />
  );
}
