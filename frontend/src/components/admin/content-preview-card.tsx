'use client';

import { type ReactNode } from 'react';
import ContentCoverImage from '@/components/content-cover-image';
import { cn } from '@/lib/utils';

type ContentPreviewCardProps = {
  imageUrl?: string | null;
  imagePosition?: string | null;
  imageScale?: number | null;
  title?: string;
  fallbackTitle: string;
  footer: ReactNode;
  className?: string;
};

export default function ContentPreviewCard({
  imageUrl,
  imagePosition,
  imageScale,
  title,
  fallbackTitle,
  footer,
  className,
}: ContentPreviewCardProps) {
  const displayTitle = title || fallbackTitle;

  return (
    <article className={cn('fac-card w-full max-w-[280px]', className)}>
      <div className="aspect-square overflow-hidden bg-muted">
        <ContentCoverImage
          src={imageUrl}
          alt={displayTitle}
          position={imagePosition}
          scale={imageScale}
        />
      </div>
      <div className="fac-card-content">
        <p className="line-clamp-1 text-[15px] font-semibold text-foreground">
          {displayTitle}
        </p>
        {footer}
      </div>
    </article>
  );
}
