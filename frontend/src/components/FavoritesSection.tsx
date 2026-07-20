"use client";

import Image from "next/image";
import { useState } from "react";
import FileViewerModal from "@/components/admin/file-viewer-modal";
import { RichTextViewer } from "@/components/admin/rich-text-editor";
import { useFavorites, type Favorite, type EntityType } from "@/hooks/useFavorites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";
import AdminModal from "@/components/admin/modal";
import { serverURL } from "@/lib/api";

export function FavoritesSection() {
  const {
    favorites,
    loading,
    removeFavorite,
  } = useFavorites();

  const [filter, setFilter] = useState<EntityType | "ALL">("ALL");
  const [viewingNote, setViewingNote] = useState<Favorite | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: string; url: string; name: string } | null>(null);

  const filteredFavorites = favorites.filter((fav) => {
    if (filter === "ALL") return true;
    return fav.entityType === filter;
  });

  const linkCount = favorites.filter((f) => f.entityType === "LINK").length;
  const scheduleCount = favorites.filter((f) => f.entityType === "SCHEDULE").length;
  const noteCount = favorites.filter((f) => f.entityType === "NOTE").length;

  const handleRemove = async (favoriteId: string) => {
    if (confirm("Deseja realmente remover este item dos favoritos?")) {
      await removeFavorite(favoriteId);
    }
  };

  const normalizeImagePosition = (position?: string | null) => {
    if (!position) return "50% 50%";
    const [x = "50%", y = "50%"] = position.trim().split(/\s+/);
    const withPercent = (value: string) =>
      value.includes("%") ? value : `${value}%`;
    return `${withPercent(x)} ${withPercent(y)}`;
  };

  const renderFavoriteCard = (favorite: Favorite) => {
    const item = favorite.link || favorite.schedule || favorite.note;
    const isLink = favorite.entityType === "LINK";
    const isSchedule = favorite.entityType === "SCHEDULE";
    const isNote = favorite.entityType === "NOTE";

    if (!item) return null;

    // Get the image URL from the API base URL
    const apiURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const imageUrl = item.imageUrl ? `${apiURL}${item.imageUrl}` : null;

    const typeLabel = isLink ? "LINK" : isSchedule ? "AGENDA" : "NOTA";

    const handleCardClick = () => {
      if (isLink && favorite.link?.url) {
        window.open(favorite.link.url, "_blank");
      } else if (isSchedule && favorite.schedule?.fileUrl) {
        setViewingFile({ id: favorite.schedule.id, url: favorite.schedule.fileUrl, name: favorite.schedule.fileName || favorite.schedule.title });
      } else if (isNote) {
        setViewingNote(favorite);
      }
    };

    return (
      <article
        key={favorite.id}
        onClick={handleCardClick}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/90 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      >
        {/* Tag com nome do item no topo esquerdo */}
        <div className="absolute left-3 top-3 z-20 max-w-[calc(100%-80px)] truncate rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
          {item.title}
        </div>

        {/* Botão de remover dos favoritos no topo direito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(favorite.id);
          }}
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-yellow-900 shadow-sm transition hover:bg-yellow-500 sm:h-8 sm:w-8"
          title="Remover dos favoritos"
        >
          <Star className="h-4 w-4 fill-current" />
        </button>

        {/* Imagem ou fundo */}
        <div className="relative h-40 w-full overflow-hidden bg-secondary/60 sm:h-48">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              width={640}
              height={320}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{
                objectPosition: normalizeImagePosition(item.imagePosition),
                transform: `scale(${item.imageScale || 1})`,
                transformOrigin: normalizeImagePosition(item.imagePosition),
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-secondary/40" />
          )}
        </div>

        {/* Tag de tipo no canto inferior direito */}
        <div className="absolute bottom-3 right-3 z-20 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-900 shadow-sm sm:px-3 sm:py-1.5 sm:text-[10px]">
          {typeLabel}
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Meus Favoritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              Meus Favoritos
            </CardTitle>
            <CardDescription>
              {favorites.length === 0
                ? "Você ainda não tem favoritos"
                : `${favorites.length} ${
                    favorites.length === 1 ? "item favoritado" : "itens favoritados"
                  }`}
            </CardDescription>
          </div>
          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant={filter === "ALL" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilter("ALL")}
              >
                Todos
              </Button>
              {linkCount > 0 && (
                <Button
                  variant={filter === "LINK" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("LINK")}
                >
                  Links
                </Button>
              )}
              {scheduleCount > 0 && (
                <Button
                  variant={filter === "SCHEDULE" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("SCHEDULE")}
                >
                  Agendas
                </Button>
              )}
              {noteCount > 0 && (
                <Button
                  variant={filter === "NOTE" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("NOTE")}
                >
                  Notas
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>Clique na estrela dos cards para adicionar aos favoritos</p>
          </div>
        ) : filteredFavorites.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum favorito nesta categoria
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFavorites.map(renderFavoriteCard)}
          </div>
        )}
      </CardContent>

      {/* Modal de visualização de nota */}
      {viewingNote && viewingNote.note && (
        <AdminModal
          open={Boolean(viewingNote)}
          title={viewingNote.note.title}
          description=""
          onClose={() => setViewingNote(null)}
          panelClassName="max-w-3xl"
        >
          <div className="space-y-4">
            {viewingNote.note.imageUrl && (
              <div className="overflow-hidden rounded-xl">
                <div className="relative h-48 w-full overflow-hidden bg-secondary/60">
                  <Image
                    src={`${serverURL}${viewingNote.note.imageUrl}`}
                    alt={viewingNote.note.title}
                    width={1200}
                    height={480}
                    unoptimized
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: normalizeImagePosition(viewingNote.note.imagePosition),
                      transform: `scale(${viewingNote.note.imageScale || 1})`,
                      transformOrigin: normalizeImagePosition(viewingNote.note.imagePosition),
                    }}
                  />
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border/70 bg-card/60 p-5">
              <RichTextViewer content={viewingNote.note.content} />
            </div>
            {viewingNote.note.category?.name && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Categoria:</span>
                <span
                  className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: viewingNote.note.category.color || "#10b981",
                    color: "#fff",
                  }}
                >
                  {viewingNote.note.category.name}
                </span>
              </div>
            )}
          </div>
        </AdminModal>
      )}

      <FileViewerModal
        open={Boolean(viewingFile)}
        scheduleId={viewingFile?.id}
        fileName={viewingFile?.name ?? ''}
        fileUrl={viewingFile?.url ?? ''}
        onClose={() => setViewingFile(null)}
      />
    </Card>
  );
}
