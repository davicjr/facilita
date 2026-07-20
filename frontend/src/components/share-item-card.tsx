'use client';

import { Download, FileText, Link2, StickyNote } from 'lucide-react';
import AdminFilterSelect from '@/components/admin/filter-select';
import AdminEntityCard from '@/components/admin/entity-card';
import ContentCoverImage from '@/components/content-cover-image';
import ContentTypeSurface from '@/components/content-type-surface';
import { FavoriteButton } from '@/components/FavoriteButton';
import UserAvatar from '@/components/user-avatar';
import { getContentTypeColor, getContentTypeLabel } from '@/lib/content-type';
import { downloadScheduleFile } from '@/lib/download';
import type { Category, Share } from '@/types';

export type ShareCardVariant = 'received' | 'sent';

type ShareItemCardProps = {
  share: Share;
  variant: ShareCardVariant;
  processingId: string | null;
  localCategories: Category[];
  onOpen: (share: Share) => void;
  onOpenFile?: (scheduleId: string, url: string, name: string) => void;
  onRemove?: (shareId: string) => void;
  onUpdateCategory?: (shareId: string, categoryId: string) => void;
};

const shareTypeIcons: Record<Share['entityType'], typeof Link2> = {
  LINK: Link2,
  SCHEDULE: FileText,
  NOTE: StickyNote,
};

function getShareTitle(share: Share) {
  if (share.entityType === 'LINK') return share.link?.title || 'Link';
  if (share.entityType === 'SCHEDULE') return share.schedule?.title || 'Documento';
  return share.note?.title || 'Nota';
}

function getShareCategory(share: Share) {
  if (share.entityType === 'LINK') return share.link?.category?.name;
  if (share.entityType === 'SCHEDULE') return share.schedule?.category?.name;
  return share.note?.category?.name;
}

function getShareCategoryColor(share: Share) {
  if (share.entityType === 'LINK') return share.link?.category?.color || null;
  if (share.entityType === 'SCHEDULE') return share.schedule?.category?.color || null;
  return share.note?.category?.color || null;
}

function getShareStatus(share: Share) {
  if (share.entityType === 'LINK') return share.link?.status || 'ACTIVE';
  if (share.entityType === 'SCHEDULE') return share.schedule?.status || 'ACTIVE';
  return share.note?.status || 'ACTIVE';
}

function getShareImage(share: Share) {
  if (share.entityType === 'LINK') return share.link?.imageUrl || null;
  if (share.entityType === 'SCHEDULE') return share.schedule?.imageUrl || null;
  return share.note?.imageUrl || null;
}

function getShareImagePosition(share: Share) {
  if (share.entityType === 'LINK') return share.link?.imagePosition;
  if (share.entityType === 'SCHEDULE') return share.schedule?.imagePosition;
  return share.note?.imagePosition;
}

function getShareImageScale(share: Share) {
  if (share.entityType === 'LINK') return share.link?.imageScale;
  if (share.entityType === 'SCHEDULE') return share.schedule?.imageScale;
  return share.note?.imageScale;
}

function getShareEntityId(share: Share) {
  if (share.entityType === 'LINK') return share.link?.id;
  if (share.entityType === 'SCHEDULE') return share.schedule?.id;
  return share.note?.id;
}

function getShareOwnerLabel(share: Share, variant: ShareCardVariant) {
  if (variant === 'received') {
    return {
      kicker: 'Compartilhado por',
      value: share.owner?.name || 'Usuário',
    };
  }

  if (share.removedAt) {
    return {
      kicker: 'Removido por',
      value: share.recipient?.name || 'Usuário',
    };
  }

  return {
    kicker: 'Enviado para',
    value: share.recipient?.name || 'Usuário',
  };
}

function getShareOwnerMeta(share: Share, variant: ShareCardVariant) {
  const label = getShareOwnerLabel(share, variant);
  const user = variant === 'received' ? share.owner : share.recipient;

  return {
    ...label,
    avatarUrl: user?.avatarUrl || null,
  };
}

export default function ShareItemCard({
  share,
  variant,
  processingId,
  localCategories,
  onOpen,
  onOpenFile,
  onRemove,
  onUpdateCategory,
}: ShareItemCardProps) {
  const shareStatus = getShareStatus(share);
  const isInactive = shareStatus === 'INACTIVE';
  const categoryLabel = getShareCategory(share) || 'Sem categoria';
  const categoryColor = getShareCategoryColor(share);
  const entityId = getShareEntityId(share);
  const scheduleFileUrl =
    share.entityType === 'SCHEDULE' ? share.schedule?.fileUrl || null : null;
  const scheduleId = share.entityType === 'SCHEDULE' ? share.schedule?.id || null : null;
  const ownerLabel = getShareOwnerMeta(share, variant);
  const dividerColor = getContentTypeColor(share.entityType);
  const accentColor = categoryColor || dividerColor;
  const hasImage = Boolean(getShareImage(share));
  const Icon = shareTypeIcons[share.entityType];

  const cover = (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:scale-[1.045]">
        {hasImage ? (
          <ContentCoverImage
            src={getShareImage(share)}
            alt={getShareTitle(share)}
            position={getShareImagePosition(share)}
            scale={getShareImageScale(share)}
            width={440}
            height={320}
          />
        ) : (
          <div className="h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:scale-[1.03] group-hover/share-card:rotate-[0.5deg]">
            <ContentTypeSurface accentColor={accentColor} icon={Icon} />
          </div>
        )}
      </div>
      {hasImage ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent transition-opacity duration-300 group-hover/share-card:from-black/60 group-hover/share-card:opacity-90" />
      ) : null}
    </div>
  );

  const details = (
    <div className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:translate-x-0.5">
      <p className="line-clamp-1 text-[14px] font-semibold text-foreground transition-colors duration-300 group-hover/share-card:text-primary">
        {getShareTitle(share)}
      </p>
      <p className="line-clamp-1 mt-1 text-[12px] text-muted-foreground">{categoryLabel}</p>
      <p className="line-clamp-1 mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {getContentTypeLabel(share.entityType)}
      </p>
    </div>
  );

  const trailing = (
    <div className="flex items-center gap-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:-translate-y-0.5">
      {scheduleFileUrl && scheduleId ? (
        <button
          type="button"
          className="fac-button-secondary !h-9 !w-9 !px-0"
          onClick={() =>
            onOpenFile
              ? onOpenFile(scheduleId, scheduleFileUrl, share.schedule?.fileName || getShareTitle(share))
              : void downloadScheduleFile(scheduleId, share.schedule?.fileName || getShareTitle(share))
          }
          aria-label={`Visualizar ${getShareTitle(share)}`}
          title="Visualizar"
          disabled={isInactive}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}

      {entityId ? (
        <FavoriteButton
          entityType={share.entityType}
          entityId={entityId}
          className="!h-9 !w-9 !border !border-border/80 !bg-background/90 hover:!bg-background"
        />
      ) : null}
    </div>
  );

  const footer = (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:translate-x-0.5">
        <UserAvatar
          name={ownerLabel.value}
          avatarUrl={ownerLabel.avatarUrl}
          size="sm"
          className="shrink-0 border-white/60 bg-white/80 shadow-[0_8px_18px_rgba(15,22,26,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/share-card:scale-105"
        />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {ownerLabel.kicker}
          </p>
          <p className="line-clamp-1 mt-1 text-[12px] text-foreground">{ownerLabel.value}</p>
        </div>
      </div>

      {variant === 'received' && onUpdateCategory ? (
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Categoria local
          </p>
          <AdminFilterSelect
            className="!h-9 text-[13px]"
            value={share.localCategoryId || ''}
            onChange={(event) => onUpdateCategory(share.id, event.target.value)}
            disabled={processingId === share.id}
            aria-label="Categoria local"
          >
            <option value="">Sem categoria local</option>
            {localCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </AdminFilterSelect>
        </div>
      ) : null}

      {variant === 'received' && onRemove ? (
        <button
          type="button"
          className="fac-button-secondary !h-9 !px-3 text-[10px] tracking-[0.16em]"
          onClick={() => onRemove(share.id)}
          disabled={processingId === share.id}
        >
          Remover
        </button>
      ) : null}
    </div>
  );

  return (
    <AdminEntityCard
      cover={cover}
      details={details}
      trailing={trailing}
      footer={footer}
      onOpen={isInactive ? undefined : () => onOpen(share)}
      className={isInactive ? 'group/share-card w-full opacity-80 grayscale' : 'group/share-card w-full'}
      coverClassName="overflow-hidden"
      contentClassName="transition-[background,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      footerClassName="transition-[background,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      hoverClassName="hover:-translate-y-1.5 hover:scale-[1.025] hover:shadow-[0_22px_38px_rgba(15,22,26,0.18)]"
      dividerColor={dividerColor}
    />
  );
}
