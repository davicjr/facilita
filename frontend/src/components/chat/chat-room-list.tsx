'use client';

import { MessageSquarePlus, Users } from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import type { ChatRoom } from '@/types';
import {
  formatChatTimestamp,
  getChatMessagePreview,
  getChatRoomCounterpart,
  getChatRoomTitle,
} from './chat-helpers';

type ChatRoomListProps = {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  currentUserId?: string | null;
  onSelect: (roomId: string) => void;
  onOpenNewDM: () => void;
  onOpenNewGroup: () => void;
};

export default function ChatRoomList({
  rooms,
  activeRoomId,
  currentUserId,
  onSelect,
  onOpenNewDM,
  onOpenNewGroup,
}: ChatRoomListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border/60 bg-white/28 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(16,23,28,0.68)_0%,rgba(12,18,22,0.78)_100%)]">
      <div className="space-y-3 border-b border-border/60 px-4 pb-3 pt-4 dark:border-white/8 dark:bg-[rgba(19,29,35,0.52)]">
        <div className="flex items-center justify-between">
          <p className="fac-form-title !mb-0">Mensagens</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenNewDM}
              title="Nova conversa"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border/70 hover:bg-white/70 hover:text-foreground dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-[rgba(46,72,84,0.28)] dark:hover:text-slate-100"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenNewGroup}
              title="Novo grupo"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border/70 hover:bg-white/70 hover:text-foreground dark:text-slate-400 dark:hover:border-white/10 dark:hover:bg-[rgba(46,72,84,0.28)] dark:hover:text-slate-100"
            >
              <Users className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {rooms.length === 0 ? (
          <div className="px-3 py-4">
            <div className="fac-empty-state !bg-white/45 !px-4 !py-8 text-[13px] dark:!bg-secondary/35">
              Nenhuma conversa ainda.
              <br />
              <span className="text-[12px] opacity-70">Inicie um DM ou crie um grupo.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {rooms.map((room) => {
              const counterpart = getChatRoomCounterpart(room, currentUserId);
              const active = room.id === activeRoomId;
              const preview = getChatMessagePreview(room.lastMessage);
              const timestamp = formatChatTimestamp(
                room.lastMessage?.createdAt ?? room.updatedAt,
              );

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelect(room.id)}
                  className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition ${
                    active
                      ? 'bg-primary/[0.09] text-foreground dark:border dark:border-cyan-400/12 dark:bg-[linear-gradient(135deg,rgba(45,77,90,0.42),rgba(29,46,56,0.62))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_24px_rgba(0,0,0,0.2)]'
                      : 'text-foreground hover:bg-black/[0.04] dark:text-slate-100 dark:hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <UserAvatar
                    name={getChatRoomTitle(room, currentUserId)}
                    avatarUrl={counterpart?.avatarUrl}
                    size="md"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">
                        {getChatRoomTitle(room, currentUserId)}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground/80 dark:text-slate-400">
                        {timestamp}
                      </span>
                    </span>

                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground/80 dark:text-slate-400">
                      {preview}
                    </span>
                  </span>

                  {room.unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                      {room.unreadCount > 99 ? '99+' : room.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
