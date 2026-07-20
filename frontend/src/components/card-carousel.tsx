'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type CardCarouselProps = {
  items: ReactNode[];
  threshold?: number;
};

const itemWidthClassName =
  'w-full min-[360px]:w-[calc((100%-1rem)/2)] min-[560px]:w-[calc((100%-2rem)/3)]';
const getVisibleColumns = (viewportWidth: number) => {
  if (viewportWidth >= 560) return 3;
  if (viewportWidth >= 360) return 2;
  return 1;
};

export default function CardCarousel({
  items,
  threshold = 3,
}: CardCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const useCarousel = items.length > threshold;
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [slideWidth, setSlideWidth] = useState<number | null>(null);

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const styles = window.getComputedStyle(viewport);
    const paddingLeft = Number.parseFloat(styles.paddingLeft || '0');
    const paddingRight = Number.parseFloat(styles.paddingRight || '0');
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0');
    const columns = getVisibleColumns(viewport.clientWidth);
    const availableWidth =
      viewport.clientWidth - paddingLeft - paddingRight - gap * (columns - 1);

    setSlideWidth(availableWidth > 0 ? Math.floor(availableWidth / columns) : null);

    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    const nextCanScrollLeft = viewport.scrollLeft > 8;
    const nextCanScrollRight = maxScrollLeft - viewport.scrollLeft > 8;

    setCanScrollLeft(nextCanScrollLeft);
    setCanScrollRight(nextCanScrollRight);
  }, []);

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const amount = Math.max(viewport.clientWidth - 72, 260);
    viewport.scrollBy({
      left: amount * direction,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!useCarousel) return;

    const frameId = window.requestAnimationFrame(updateMetrics);
    const handleResize = () => updateMetrics();
    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateMetrics())
        : null;

    if (resizeObserver && viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [items.length, updateMetrics, useCarousel]);

  if (!useCarousel) {
    return (
      <div className="flex flex-wrap gap-4">
        {items.map((item, index) => (
          <div key={index} className={itemWidthClassName}>
            {item}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canScrollLeft}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:border-border/70 disabled:bg-white/60 disabled:text-muted-foreground/55 dark:disabled:bg-secondary/50 dark:disabled:text-muted-foreground/60',
            canScrollLeft
              ? 'border-foreground bg-foreground text-background hover:border-foreground hover:bg-foreground/90 hover:text-background'
              : '',
          )}
          onClick={() => scrollByPage(-1)}
          aria-label="Rolar para a esquerda"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          disabled={!canScrollRight}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:border-border/70 disabled:bg-white/60 disabled:text-muted-foreground/55 dark:disabled:bg-secondary/50 dark:disabled:text-muted-foreground/60',
            canScrollRight
              ? 'border-foreground bg-foreground text-background hover:border-foreground hover:bg-foreground/90 hover:text-background'
              : '',
          )}
          onClick={() => scrollByPage(1)}
          aria-label="Rolar para a direita"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="-mx-4 overflow-hidden px-4">
        <div
          ref={viewportRef}
          onScroll={updateMetrics}
          className="-mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pt-6 pb-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={`snap-start shrink-0 ${itemWidthClassName}`}
              style={slideWidth ? { width: `${slideWidth}px` } : undefined}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
