'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/admin/confirm-modal';
import UserAvatar from '@/components/user-avatar';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage, ChatRoom } from '@/types';
import ChatInput from './chat-input';
import {
  formatDateSeparator,
  getChatRoomCounterpart,
  getChatRoomDescription,
  getChatRoomTitle,
  isOwnChatMessage,
  isSameDateDay,
  shouldGroupWithPrev,
} from './chat-helpers';
import ChatMessageBubble from './chat-message-bubble';
import ChatTypingIndicator from './chat-typing-indicator';

const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_TYPING_USERS: Array<{ userId: string; name: string }> = [];

type ChatRoomViewProps = {
  room: ChatRoom | null;
  onBack?: () => void;
  onEnsureRoomLoaded: (roomId: string) => Promise<void>;
  onLoadMoreMessages: (roomId: string, cursor?: string | null) => Promise<unknown>;
  onMarkRead: (roomId: string) => Promise<void>;
  onSendMessage: (roomId: string, content: string) => Promise<unknown>;
  onStartTyping: (roomId: string) => void;
  onStopTyping: (roomId: string) => void;
  onEditMessage: (messageId: string, content: string) => Promise<unknown>;
  onDeleteMessage: (messageId: string) => Promise<unknown>;
  onDeleteRoom: (roomId: string) => Promise<void>;
};

export default function ChatRoomView({
  room,
  onBack,
  onEnsureRoomLoaded,
  onLoadMoreMessages,
  onMarkRead,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onEditMessage,
  onDeleteMessage,
  onDeleteRoom,
}: ChatRoomViewProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const roomId = room?.id ?? null;
  const messages = useChatStore((state) =>
    roomId ? state.messages[roomId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES,
  );
  const typingUsers = useChatStore((state) =>
    roomId ? state.typingUsers[roomId] ?? EMPTY_TYPING_USERS : EMPTY_TYPING_USERS,
  );
  const nextCursor = useChatStore((state) =>
    roomId ? state.nextCursorByRoom[roomId] : undefined,
  );
  const loadingMessages = useChatStore((state) =>
    roomId ? Boolean(state.loadingMessages[roomId]) : false,
  );

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousRoomIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  const activeEditingMessage =
    editingMessage && editingMessage.roomId === room?.id ? editingMessage : null;

  useEffect(() => {
    if (!roomId) return;
    void onEnsureRoomLoaded(roomId);
    void onMarkRead(roomId);
  }, [onEnsureRoomLoaded, onMarkRead, roomId]);

  useEffect(() => {
    if (!room) return;

    const currentRoomId = room.id;
    const previousRoomId = previousRoomIdRef.current;
    const currentMessageCount = messages.length;

    if (
      previousRoomId !== currentRoomId ||
      currentMessageCount > previousMessageCountRef.current
    ) {
      const element = scrollRef.current;
      if (element) {
        window.requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
      }
    }

    previousRoomIdRef.current = currentRoomId;
    previousMessageCountRef.current = currentMessageCount;
  }, [messages.length, room]);

  const counterpart = useMemo(
    () => (room ? getChatRoomCounterpart(room, currentUserId) : null),
    [currentUserId, room],
  );

  const isGroupRoom = room?.type === 'GROUP';

  const enrichedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const prev = messages[index - 1];
        const next = messages[index + 1];
        const grouped = shouldGroupWithPrev(message, prev);
        const nextGrouped = next ? shouldGroupWithPrev(next, message) : false;
        return {
          message,
          isFirst: !grouped,
          isLast: !nextGrouped,
          showDateSeparator:
            !prev || !isSameDateDay(prev.createdAt, message.createdAt),
        };
      }),
    [messages],
  );

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="fac-empty-state flex w-full max-w-[360px] flex-col items-center gap-2 !bg-white/45 !py-8 dark:!bg-secondary/35">
          <p className="fac-form-title !mb-0">Conversas</p>
          <h3 className="font-display text-[24px] leading-none text-foreground">
            Selecione uma conversa
          </h3>
          <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
            Mensagens chegam em tempo real e o badge atualiza mesmo com o chat fechado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/50 bg-white/70 px-4 py-3 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(18,28,34,0.86),rgba(15,23,28,0.8))]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-foreground lg:hidden dark:border-white/10 dark:bg-[rgba(23,34,40,0.94)] dark:text-slate-100"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <UserAvatar
          name={getChatRoomTitle(room, currentUserId)}
          avatarUrl={counterpart?.avatarUrl}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {getChatRoomTitle(room, currentUserId)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {getChatRoomDescription(room, currentUserId)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDeleteRoomOpen(true)}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/60 transition hover:bg-destructive/8 hover:text-destructive dark:text-slate-500 dark:hover:bg-destructive/12"
          aria-label="Apagar conversa"
          title="Apagar conversa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ConfirmModal
        open={deleteRoomOpen}
        title="Apagar conversa"
        description="Apagar esta conversa para você? A outra pessoa continuará com o histórico dela."
        confirmLabel="Apagar"
        loading={deletingRoom}
        onClose={() => setDeleteRoomOpen(false)}
        onConfirm={async () => {
          setDeletingRoom(true);
          try {
            await onDeleteRoom(room.id);
            setDeleteRoomOpen(false);
          } catch {
            notify.error('Não foi possível apagar a conversa.');
          } finally {
            setDeletingRoom(false);
          }
        }}
      />

      <div
        ref={scrollRef}
        onScroll={(event) => {
          if (!room || !nextCursor || loadingMessages) return;
          if (event.currentTarget.scrollTop <= 40) {
            void onLoadMoreMessages(room.id, nextCursor);
          }
        }}
        className="flex-1 overflow-y-auto px-5 py-4 dark:bg-[radial-gradient(circle_at_top,rgba(39,73,85,0.1)_0%,transparent_28%),linear-gradient(180deg,rgba(11,16,20,0.2)_0%,rgba(10,14,17,0.34)_100%)]"
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : null}

        {nextCursor ? (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={() => void onLoadMoreMessages(room.id, nextCursor)}
              className="rounded-full border border-border/60 bg-card/90 px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-card"
            >
              Carregar anteriores
            </button>
          </div>
        ) : null}

        {enrichedMessages.map(({ message, isFirst, showDateSeparator }) => (
          <div key={message.id}>
            {showDateSeparator ? (
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/50 dark:bg-white/8" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 dark:text-slate-500">
                  {formatDateSeparator(message.createdAt)}
                </span>
                <div className="h-px flex-1 bg-border/50 dark:bg-white/8" />
              </div>
            ) : null}

            <ChatMessageBubble
              message={message}
              isOwn={isOwnChatMessage(message, currentUserId)}
              isFirst={isFirst}
              isGroupRoom={isGroupRoom}
              onEdit={(selected) => setEditingMessage(selected)}
              onDelete={(selected) => {
                void onDeleteMessage(selected.id).catch(() => {
                  notify.error('Nao foi possivel apagar a mensagem.');
                });
              }}
            />
          </div>
        ))}

        {typingUsers.length > 0 ? (
          <div className="mt-3">
            <ChatTypingIndicator names={typingUsers.map((u) => u.name)} />
          </div>
        ) : null}
      </div>

      <div className="shrink-0">
        <ChatInput
          key={activeEditingMessage?.id ?? `composer:${room.id}`}
          roomId={room.id}
          editingMessage={activeEditingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSubmit={async (content) => {
            if (activeEditingMessage) {
              await onEditMessage(activeEditingMessage.id, content);
              setEditingMessage(null);
              return;
            }
            await onSendMessage(room.id, content);
          }}
          onStartTyping={onStartTyping}
          onStopTyping={onStopTyping}
        />
      </div>
    </div>
  );
}
