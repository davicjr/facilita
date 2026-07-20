"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useFavorites, type EntityType } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  entityType: EntityType;
  entityId: string;
  showCount?: boolean;
  className?: string;
}

export function FavoriteButton({
  entityType,
  entityId,
  showCount = false,
  className,
}: FavoriteButtonProps) {
  const { isFavorited, toggleFavorite, countEntityFavorites } = useFavorites();
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const favorited = isFavorited(entityId);

  useEffect(() => {
    if (showCount) {
      countEntityFavorites(entityType, entityId).then(setCount);
    }
  }, [showCount, entityType, entityId, countEntityFavorites]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    await toggleFavorite(entityType, entityId);

    // Atualizar contador se mostrado
    if (showCount) {
      const newCount = await countEntityFavorites(entityType, entityId);
      setCount(newCount);
    }

    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-all sm:h-8 sm:w-8",
        isAnimating && "scale-110",
        favorited
          ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-500"
          : "bg-white/90 text-muted-foreground hover:bg-white hover:text-yellow-400 dark:bg-secondary/80 dark:text-foreground dark:hover:bg-secondary",
        className
      )}
      title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Star
        className={cn(
          "h-3.5 w-3.5 transition-all duration-300 sm:h-4 sm:w-4",
          favorited && "fill-current"
        )}
      />
      {showCount && count > 0 && (
        <span className="ml-1 text-xs">{count}</span>
      )}
    </button>
  );
}
