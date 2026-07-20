'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type UseClientPaginationOptions = {
  cardWidth?: number;
  gap?: number;
  rows?: number;
};

export default function useClientPagination<T>(
  items: T[],
  { cardWidth = 220, gap = 12, rows = 3 }: UseClientPaginationOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const width = el.clientWidth;
      const next = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
      setColumns(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardWidth, gap]);

  const pageSize = columns * rows;

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    containerRef,
    pageItems,
    page: safePage,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
    nextPage: () => setPage((prev) => Math.min(totalPages, prev + 1)),
    previousPage: () => setPage((prev) => Math.max(1, prev - 1)),
  };
}
