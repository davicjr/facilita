'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import ChatNewDmModal from './chat-new-dm-modal';
import ChatNewGroupModal from './chat-new-group-modal';
import ChatRoomList from './chat-room-list';
import ChatRoomView from './chat-room-view';

type ChatDrawerProps = {
  embedded?: boolean;
  embeddedHeight?: number;
  embeddedMaxHeight?: number;
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
};

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 620;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function ChatDrawer({
  embedded = false,
  embeddedHeight = 720,
  embeddedMaxHeight,
  sidebarWidth = 320,
  onSidebarWidthChange,
}: ChatDrawerProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const rooms = useChatStore((state) => state.rooms);
  const activeRoomId = useChatStore((state) => state.activeRoomId);
  const isOpen = useChatStore((state) => state.isOpen);
  const setOpen = useChatStore((state) => state.setOpen);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const {
    ensureRoomLoaded,
    loadMoreMessages,
    markRead,
    sendMessage,
    startTyping,
    stopTyping,
    deleteRoom,
    editMessage,
    deleteMessage,
  } = useChat();

  const [newDMOpen, setNewDMOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const layoutRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const shouldRender = embedded || isOpen;

  useEffect(() => {
    if (!isResizingSidebar || !onSidebarWidthChange) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = layoutRef.current;
      if (!container) return;

      const bounds = container.getBoundingClientRect();
      const nextWidth = clamp(
        event.clientX - bounds.left,
        MIN_SIDEBAR_WIDTH,
        MAX_SIDEBAR_WIDTH,
      );
      onSidebarWidthChange(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingSidebar, onSidebarWidthChange]);

  if (!shouldRender) return null;

  const layoutStyle = embedded
    ? ({ '--chat-sidebar-width': `${sidebarWidth}px` } as CSSProperties)
    : undefined;

  const content = (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden',
        'bg-[linear-gradient(160deg,rgba(255,255,255,0.97)_0%,rgba(248,244,238,0.95)_100%)]',
        'dark:bg-[radial-gradient(circle_at_top,rgba(49,97,115,0.16)_0%,transparent_34%),linear-gradient(160deg,rgba(11,18,22,0.98)_0%,rgba(15,21,26,0.97)_48%,rgba(12,17,21,0.99)_100%)]',
        embedded
          ? 'h-full rounded-[18px] border border-border/70 shadow-[0_12px_30px_rgba(15,22,26,0.08)] dark:border-border dark:shadow-[0_12px_30px_rgba(0,0,0,0.24)]'
          : 'h-[min(90vh,880px)] rounded-[24px] border border-border/60 shadow-[0_24px_64px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.08)] dark:border-white/10 dark:shadow-[0_28px_80px_rgba(0,0,0,0.45),0_8px_24px_rgba(8,14,18,0.5)]',
      )}
    >
      {!embedded ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground transition hover:text-foreground dark:border-white/10 dark:bg-[rgba(18,28,34,0.88)] dark:text-slate-400 dark:hover:bg-[rgba(29,44,51,0.92)] dark:hover:text-slate-100"
          aria-label="Fechar chat"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <div ref={layoutRef} className="min-h-0 flex flex-1 flex-col lg:flex-row" style={layoutStyle}>
        <div
          className={cn(
            'min-h-0 w-full lg:w-[var(--chat-sidebar-width)] lg:shrink-0',
            activeRoom ? 'hidden lg:block' : 'block',
          )}
        >
          <ChatRoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            currentUserId={currentUserId}
            onSelect={(roomId) => {
              setActiveRoom(roomId);
              if (!embedded) setOpen(true);
            }}
            onOpenNewDM={() => setNewDMOpen(true)}
            onOpenNewGroup={() => setNewGroupOpen(true)}
          />
        </div>

        {embedded ? (
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            className="relative hidden w-3 shrink-0 cursor-col-resize items-center justify-center border-l border-r border-border/30 bg-card/40 transition hover:bg-muted/35 lg:flex dark:border-white/8 dark:bg-[rgba(16,24,29,0.78)]"
            aria-label="Redimensionar barra de conversas"
            title="Arraste para redimensionar a barra de conversas"
          >
            <span
              className={cn(
                'pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/50 dark:bg-white/12',
                isResizingSidebar && 'bg-primary/60',
              )}
            />
            <GripVertical className="relative h-4 w-4 text-muted-foreground/65" />
          </button>
        ) : null}

        <div className={cn('min-h-0 min-w-0 flex-1', activeRoom ? 'block' : 'hidden lg:block')}>
          <ChatRoomView
            room={activeRoom}
            onBack={activeRoom ? () => setActiveRoom(null) : undefined}
            onEnsureRoomLoaded={ensureRoomLoaded}
            onLoadMoreMessages={loadMoreMessages}
            onMarkRead={markRead}
            onSendMessage={sendMessage}
            onStartTyping={startTyping}
            onStopTyping={stopTyping}
            onDeleteRoom={deleteRoom}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
          />
        </div>
      </div>

      <ChatNewDmModal open={newDMOpen} onClose={() => setNewDMOpen(false)} />
      <ChatNewGroupModal open={newGroupOpen} onClose={() => setNewGroupOpen(false)} />
    </div>
  );

  if (embedded) {
    return (
      <div
        className="min-h-[460px] w-full"
        style={{
          height: `${embeddedHeight}px`,
          maxHeight: embeddedMaxHeight
            ? `${embeddedMaxHeight}px`
            : 'calc(100dvh - 220px)',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[3px]"
        aria-label="Fechar chat"
      />
      <div className="fixed inset-y-4 right-4 z-50 w-[min(1040px,calc(100vw-2rem))]">
        {content}
      </div>
    </>
  );
}
