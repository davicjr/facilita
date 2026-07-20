'use client';

import ContentCoverImage from '@/components/content-cover-image';
import { formatBytes } from '@/lib/format';
import type { UploadedImage } from '@/types';
import AdminEntityCard from './entity-card';

type AdminImageCardProps = {
  image: UploadedImage;
  onOpen?: () => void;
  displayMode?: 'default' | 'imageOnly';
};

export default function AdminImageCard({
  image,
  onOpen,
  displayMode = 'default',
}: AdminImageCardProps) {
  const isImageOnly = displayMode === 'imageOnly';
  const coverClassName = isImageOnly ? 'aspect-square h-auto !bg-transparent' : undefined;
  const cardClassName = isImageOnly
    ? '!border-transparent !shadow-none hover:!shadow-none'
    : undefined;

  const cover = (
    <div className="absolute inset-0">
      <ContentCoverImage
        src={image.url}
        alt={image.alt || image.originalName}
        width={image.width ?? 440}
        height={image.height ?? 440}
        scale={isImageOnly ? 1.35 : 1}
      />
      {isImageOnly ? null : (
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/8 to-transparent" />
      )}
    </div>
  );

  const details = (
    <div>
      <p className="break-words text-[14px] font-semibold leading-snug text-foreground">
        {image.originalName}
      </p>
      <p className="break-words mt-1 text-[12px] text-muted-foreground">
        {image.user?.name || 'Usuário'}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {formatBytes(image.size, 1)}
      </p>
    </div>
  );

  const trailing = (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Uso</p>
      <p className="mt-1 text-[18px] font-semibold leading-none text-foreground">
        {image.usageCount ?? 0}
      </p>
    </div>
  );

  return (
    <AdminEntityCard
      cover={cover}
      details={isImageOnly ? null : details}
      trailing={isImageOnly ? null : trailing}
      onOpen={onOpen}
      className={[
        cardClassName,
        image.status === 'INACTIVE' ? 'opacity-80 grayscale' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      coverClassName={coverClassName}
      contentClassName={isImageOnly ? 'hidden' : undefined}
    />
  );
}
