'use client';

import { Link2, Share2 } from 'lucide-react';
import { type ReactNode } from 'react';
import ContentCoverImage from '@/components/content-cover-image';
import ContentTypeSurface from '@/components/content-type-surface';
import { getContentTypeColor } from '@/lib/content-type';
import { cn } from '@/lib/utils';
import type { Link } from '@/types';
import AdminEntityCard from './entity-card';

type AdminLinkCardProps = {
  link: Pick<
    Link,
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

export default function AdminLinkCard({
  link,
  onEdit,
  onShare,
  onToggleStatus,
  previewAction,
  size = 'default',
}: AdminLinkCardProps) {
  const isPreview = size === 'preview';
  const coverWidth = isPreview ? 520 : 440;
  const coverHeight = isPreview ? 360 : 320;
  const coverClassName = isPreview ? 'h-44' : undefined;
  const contentClassName = isPreview ? 'px-4 py-3' : undefined;
  const cardClassName = cn(
    isPreview ? 'w-[248px]' : undefined,
    link.status === 'INACTIVE' ? 'opacity-80 grayscale' : undefined,
  );
  const dividerColor = getContentTypeColor('LINK');
  const accentColor = link.color || link.category?.color || dividerColor;
  const categoryLabel = link.category?.name || 'Sem categoria';
  const hasImage = Boolean(link.imageUrl);

  const cover = (
    <div className="absolute inset-0">
      {hasImage ? (
        <ContentCoverImage
          src={link.imageUrl}
          alt={link.title}
          position={link.imagePosition}
          scale={link.imageScale}
          width={coverWidth}
          height={coverHeight}
        />
      ) : (
        <ContentTypeSurface accentColor={accentColor} icon={Link2} />
      )}
      {hasImage ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
      ) : null}
    </div>
  );

  const coverOverlay = onShare ? (
    <button
      type="button"
      aria-label={`Compartilhar ${link.title}`}
      title={link.shareCount ? `Compartilhado com ${link.shareCount}` : 'Compartilhar'}
      className={cn(
        'fac-button-secondary !h-9 !w-9 !px-0 !bg-white/92 shadow-[0_6px_14px_rgba(15,22,26,0.18)] backdrop-blur',
        link.shareCount
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
    <p className="break-words text-[14px] font-semibold leading-snug text-foreground">{link.title}</p>
  );

  const controls: ReactNode = previewAction
    ? previewAction
    : onToggleStatus
      ? (
          <button
            type="button"
            role="switch"
            aria-checked={link.status === 'ACTIVE'}
            aria-label={link.status === 'ACTIVE' ? `Desativar ${link.title}` : `Ativar ${link.title}`}
            className="fac-toggle shrink-0"
            data-state={link.status === 'ACTIVE' ? 'on' : 'off'}
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
