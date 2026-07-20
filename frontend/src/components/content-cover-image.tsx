'use client';

import Image from 'next/image';
import { normalizeImagePosition, resolveAssetUrl } from '@/lib/image';
import { cn } from '@/lib/utils';

type ContentCoverImageProps = {
  src?: string | null;
  alt: string;
  position?: string | null;
  scale?: number | null;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
};

export default function ContentCoverImage({
  src,
  alt,
  position,
  scale,
  width = 560,
  height = 560,
  className,
  fallbackClassName,
}: ContentCoverImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'h-full w-full bg-gradient-to-b from-black/15 to-black/5',
          fallbackClassName,
        )}
      />
    );
  }

  const objectPosition = normalizeImagePosition(position);

  return (
    <Image
      src={resolveAssetUrl(src)}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={cn('block h-full w-full object-cover', className)}
      style={{
        objectPosition,
        transform: `scale(${scale ?? 1})`,
        transformOrigin: objectPosition,
      }}
    />
  );
}
