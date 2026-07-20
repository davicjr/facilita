'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { Category } from '@/types';

type ContentStatus = 'ACTIVE' | 'INACTIVE';

type CatalogItem = {
  id: string;
  ownerId?: string | null;
  status: ContentStatus;
};

type UseAdminContentCatalogOptions = {
  adminListPath: string;
  resourcePath: string;
  errorMessage: string;
  isSuperadmin: boolean;
  userId?: string;
};

export default function useAdminContentCatalog<T extends CatalogItem>({
  adminListPath,
  resourcePath,
  errorMessage,
  isSuperadmin,
  userId,
}: UseAdminContentCatalogOptions) {
  const [items, setItems] = useState<T[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [itemsResponse, categoriesResponse] = await Promise.all([
        api.get(isSuperadmin ? adminListPath : resourcePath, {
          params: { includeInactive: true },
        }),
        api.get('/categories', { params: { includeInactive: true } }),
      ]);

      const rawItems = Array.isArray(itemsResponse.data) ? (itemsResponse.data as T[]) : [];
      const scopedItems = isSuperadmin
        ? rawItems
        : rawItems.filter((item) => item.ownerId === userId);

      setItems(scopedItems);
      setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, errorMessage));
    } finally {
      setLoading(false);
    }
  }, [adminListPath, errorMessage, isSuperadmin, resourcePath, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = useCallback(
    async (item: T) => {
      try {
        await api.patch(`${resourcePath}/${item.id}`, {
          status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        });
      } catch {
        // O interceptor global já notifica o erro.
      } finally {
        await load();
      }
    },
    [load, resourcePath],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await api.delete(`${resourcePath}/${id}`);
      await load();
    },
    [load, resourcePath],
  );

  return {
    items,
    categories,
    loading,
    error,
    load,
    toggleStatus,
    removeItem,
  };
}
