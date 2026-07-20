'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { UploadedImage, ImageFilters } from '@/types';

interface ImageGalleryResponse {
  data: UploadedImage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useImageGallery(
  filters?: ImageFilters,
  initialPage = 1,
  initialLimit = 20,
) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, number | string | string[] | undefined> = {
        page,
        limit,
        ...filters,
      };

      const response = await api.get<ImageGalleryResponse>('/uploads/images', {
        params,
        skipNotify: true,
      });

      setImages(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Erro ao carregar imagens.'));
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const refresh = useCallback(async () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    await loadImages();
  }, [loadImages, page]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  }, [page, totalPages]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setPage(newPage);
      }
    },
    [totalPages],
  );

  return {
    images,
    loading,
    error,
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    setPage: goToPage,
    nextPage,
    previousPage,
    refresh,
  };
}
