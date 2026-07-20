"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/error";
import { notify } from "@/lib/notify";
import { useAuthStore } from "@/stores/auth-store";
import type { Link, Note, UploadedSchedule } from "@/types";

export type EntityType = "LINK" | "SCHEDULE" | "NOTE";

export interface Favorite {
  id: string;
  userId: string;
  entityType: EntityType;
  linkId?: string;
  scheduleId?: string;
  noteId?: string;
  createdAt: string;
  link?: Link | null;
  schedule?: UploadedSchedule | null;
  note?: Note | null;
}

type FavoritesContextValue = {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
  favoritedItems: Set<string>;
  fetchFavorites: (type?: EntityType) => Promise<Favorite[]>;
  addFavorite: (entityType: EntityType, entityId: string) => Promise<Favorite>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  removeFavoriteByEntity: (entityType: EntityType, entityId: string) => Promise<void>;
  toggleFavorite: (entityType: EntityType, entityId: string) => Promise<void>;
  isFavorited: (entityId: string) => boolean;
  checkFavorited: (entityType: EntityType, entityId: string) => Promise<boolean>;
  countMyFavorites: () => Promise<number>;
  countEntityFavorites: (entityType: EntityType, entityId: string) => Promise<number>;
};

type CreateFavoritePayload = {
  entityType: EntityType;
  linkId?: string;
  scheduleId?: string;
  noteId?: string;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set());

  const findFavoriteByEntity = useCallback(
    (items: Favorite[], entityType: EntityType, entityId: string) => {
      if (entityType === "LINK") {
        return items.find((fav) => fav.linkId === entityId);
      }
      if (entityType === "SCHEDULE") {
        return items.find((fav) => fav.scheduleId === entityId);
      }
      if (entityType === "NOTE") {
        return items.find((fav) => fav.noteId === entityId);
      }
      return undefined;
    },
    []
  );

  const syncFavoritedItems = useCallback((items: Favorite[]) => {
    const favIds = new Set<string>();
    items.forEach((fav) => {
      if (fav.linkId) favIds.add(fav.linkId);
      if (fav.scheduleId) favIds.add(fav.scheduleId);
      if (fav.noteId) favIds.add(fav.noteId);
    });
    setFavoritedItems(favIds);
  }, []);

  const fetchFavorites = useCallback(
    async (type?: EntityType): Promise<Favorite[]> => {
      setLoading(true);
      setError(null);
      try {
        const url = type ? `/favorites/me?type=${type}` : "/favorites/me";
        const response = await api.get(url);
        setFavorites(response.data);
        syncFavoritedItems(response.data);
        return response.data;
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, "Erro ao carregar favoritos");
        setError(message);
        console.error("Erro ao buscar favoritos:", error);
        notify.error(message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [syncFavoritedItems]
  );

  const addFavorite = useCallback(
    async (entityType: EntityType, entityId: string) => {
      try {
        const payload: CreateFavoritePayload = { entityType };

        if (entityType === "LINK") {
          payload.linkId = entityId;
        } else if (entityType === "SCHEDULE") {
          payload.scheduleId = entityId;
        } else if (entityType === "NOTE") {
          payload.noteId = entityId;
        }

        const response = await api.post(
          "/favorites",
          payload,
          { skipNotify: true }
        );

        setFavorites((prev) => [response.data, ...prev]);
        setFavoritedItems((prev) => new Set(prev).add(entityId));

        notify.success("Adicionado aos favoritos!");
        return response.data;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "status" in error.response &&
          error.response.status === 409
        ) {
          const refreshed = await fetchFavorites();
          const existing = findFavoriteByEntity(refreshed, entityType, entityId);
          if (existing) {
            return existing;
          }
        }
        const message = getApiErrorMessage(error, "Erro ao adicionar favorito");
        notify.error(message);
        throw error;
      }
    },
    [fetchFavorites, findFavoriteByEntity]
  );

  const removeFavorite = useCallback(async (favoriteId: string) => {
    try {
      await api.delete(
        `/favorites/${favoriteId}`,
        { skipNotify: true }
      );

      setFavorites((prev) => {
        const removed = prev.find((f) => f.id === favoriteId);
        if (removed) {
          const entityId = removed.linkId || removed.scheduleId || removed.noteId;
          if (entityId) {
            setFavoritedItems((prevIds) => {
              const newIds = new Set(prevIds);
              newIds.delete(entityId);
              return newIds;
            });
          }
        }
        return prev.filter((f) => f.id !== favoriteId);
      });

      notify.success("Removido dos favoritos");
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Erro ao remover favorito");
      notify.error(message);
      throw error;
    }
  }, []);

  const removeFavoriteByEntity = useCallback(
    async (entityType: EntityType, entityId: string) => {
      try {
        await api.delete(
          `/favorites/entity/${entityType}/${entityId}`,
          { skipNotify: true }
        );

        setFavorites((prev) =>
          prev.filter((f) => {
            if (entityType === "LINK") return f.linkId !== entityId;
            if (entityType === "SCHEDULE") return f.scheduleId !== entityId;
            if (entityType === "NOTE") return f.noteId !== entityId;
            return true;
          })
        );
        setFavoritedItems((prev) => {
          const newIds = new Set(prev);
          newIds.delete(entityId);
          return newIds;
        });

        notify.success("Removido dos favoritos");
      } catch (error: unknown) {
        const message = getApiErrorMessage(error, "Erro ao remover favorito");
        notify.error(message);
        throw error;
      }
    },
    []
  );

  const toggleFavorite = useCallback(
    async (entityType: EntityType, entityId: string) => {
      const isFavorited = favoritedItems.has(entityId);

      if (isFavorited) {
        await removeFavoriteByEntity(entityType, entityId);
      } else {
        await addFavorite(entityType, entityId);
      }
    },
    [favoritedItems, addFavorite, removeFavoriteByEntity]
  );

  const isFavorited = useCallback(
    (entityId: string): boolean => {
      return favoritedItems.has(entityId);
    },
    [favoritedItems]
  );

  const checkFavorited = useCallback(
    async (entityType: EntityType, entityId: string): Promise<boolean> => {
      try {
        const response = await api.get(
          `/favorites/check/${entityType}/${entityId}`
        );
        return response.data.isFavorited;
      } catch (error) {
        console.error("Erro ao verificar favorito:", error);
        return false;
      }
    },
    []
  );

  const countMyFavorites = useCallback(async (): Promise<number> => {
    try {
      const response = await api.get("/favorites/me/count");
      return response.data.count;
    } catch (error) {
      console.error("Erro ao contar favoritos:", error);
      return 0;
    }
  }, []);

  const countEntityFavorites = useCallback(
    async (entityType: EntityType, entityId: string): Promise<number> => {
      try {
        const response = await api.get(
          `/favorites/entity/${entityType}/${entityId}/count`
        );
        return response.data.count;
      } catch (error) {
        console.error("Erro ao contar favoritos da entidade:", error);
        return 0;
      }
    },
    []
  );

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      setFavorites([]);
      setFavoritedItems(new Set());
      setError(null);
      setLoading(false);
      return;
    }
    fetchFavorites().catch(() => undefined);
  }, [fetchFavorites, hasHydrated, user]);

  const value = useMemo(
    () => ({
      favorites,
      loading,
      error,
      favoritedItems,
      fetchFavorites,
      addFavorite,
      removeFavorite,
      removeFavoriteByEntity,
      toggleFavorite,
      isFavorited,
      checkFavorited,
      countMyFavorites,
      countEntityFavorites,
    }),
    [
      favorites,
      loading,
      error,
      favoritedItems,
      fetchFavorites,
      addFavorite,
      removeFavorite,
      removeFavoriteByEntity,
      toggleFavorite,
      isFavorited,
      checkFavorited,
      countMyFavorites,
      countEntityFavorites,
    ]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
