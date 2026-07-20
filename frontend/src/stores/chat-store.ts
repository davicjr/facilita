'use client';

import { create } from 'zustand';
import type { ChatMessage, ChatRoom } from '@/types';

type TypingUser = {
  userId: string;
  name: string;
};

type ChatState = {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Record<string, ChatMessage[]>;
  nextCursorByRoom: Record<string, string | null | undefined>;
  loadingMessages: Record<string, boolean>;
  typingUsers: Record<string, TypingUser[]>;
  isOpen: boolean;
  totalUnread: number;
  setRooms: (rooms: ChatRoom[]) => void;
  upsertRoom: (room: ChatRoom) => void;
  removeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string | null) => void;
  setRoomLoading: (roomId: string, loading: boolean) => void;
  setRoomMessages: (
    roomId: string,
    messages: ChatMessage[],
    nextCursor: string | null,
  ) => void;
  prependMessages: (
    roomId: string,
    messages: ChatMessage[],
    nextCursor: string | null,
  ) => void;
  addMessage: (
    message: ChatMessage,
    options?: { incrementUnread?: boolean },
  ) => void;
  updateMessage: (
    roomId: string,
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => void;
  applyReadUpdate: (
    roomId: string,
    userId: string,
    lastReadAt: string,
    currentUserId?: string | null,
  ) => void;
  setTyping: (roomId: string, user: TypingUser, isTyping: boolean) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  clear: () => void;
};

const sortRooms = (rooms: ChatRoom[]) =>
  [...rooms].sort((left, right) => {
    const leftTimestamp = new Date(left.lastMessage?.createdAt ?? left.updatedAt).getTime();
    const rightTimestamp = new Date(
      right.lastMessage?.createdAt ?? right.updatedAt,
    ).getTime();

    return rightTimestamp - leftTimestamp;
  });

const recalculateTotalUnread = (rooms: ChatRoom[]) =>
  rooms.reduce((total, room) => total + Math.max(0, room.unreadCount ?? 0), 0);

const mergeUniqueMessages = (messages: ChatMessage[]) => {
  const unique = new Map<string, ChatMessage>();
  messages.forEach((message) => unique.set(message.id, message));
  return [...unique.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};

export const useChatStore = create<ChatState>((set) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  nextCursorByRoom: {},
  loadingMessages: {},
  typingUsers: {},
  isOpen: false,
  totalUnread: 0,

  setRooms: (rooms) =>
    set({
      rooms: sortRooms(rooms),
      totalUnread: recalculateTotalUnread(rooms),
    }),

  upsertRoom: (room) =>
    set((state) => {
      const rooms = [...state.rooms];
      const index = rooms.findIndex((item) => item.id === room.id);

      if (index >= 0) {
        rooms[index] = room;
      } else {
        rooms.push(room);
      }

      const sorted = sortRooms(rooms);
      return {
        rooms: sorted,
        totalUnread: recalculateTotalUnread(sorted),
      };
    }),

  removeRoom: (roomId) =>
    set((state) => {
      const rooms = state.rooms.filter((room) => room.id !== roomId);
      const messages = { ...state.messages };
      const nextCursorByRoom = { ...state.nextCursorByRoom };
      const loadingMessages = { ...state.loadingMessages };
      const typingUsers = { ...state.typingUsers };

      delete messages[roomId];
      delete nextCursorByRoom[roomId];
      delete loadingMessages[roomId];
      delete typingUsers[roomId];

      return {
        rooms,
        activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
        messages,
        nextCursorByRoom,
        loadingMessages,
        typingUsers,
        totalUnread: recalculateTotalUnread(rooms),
      };
    }),

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  setRoomLoading: (roomId, loading) =>
    set((state) => ({
      loadingMessages: {
        ...state.loadingMessages,
        [roomId]: loading,
      },
    })),

  setRoomMessages: (roomId, messages, nextCursor) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: mergeUniqueMessages(messages),
      },
      nextCursorByRoom: {
        ...state.nextCursorByRoom,
        [roomId]: nextCursor,
      },
    })),

  prependMessages: (roomId, messages, nextCursor) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: mergeUniqueMessages([
          ...messages,
          ...(state.messages[roomId] ?? []),
        ]),
      },
      nextCursorByRoom: {
        ...state.nextCursorByRoom,
        [roomId]: nextCursor,
      },
    })),

  addMessage: (message, options) =>
    set((state) => {
      const shouldIncrementUnread = Boolean(options?.incrementUnread);
      const messages = mergeUniqueMessages([
        ...(state.messages[message.roomId] ?? []),
        message,
      ]);

      const rooms = state.rooms.map((room) =>
        room.id === message.roomId
          ? {
              ...room,
              lastMessage: message,
              updatedAt: message.createdAt,
              unreadCount: shouldIncrementUnread
                ? room.unreadCount + 1
                : room.unreadCount,
            }
          : room,
      );

      const sorted = sortRooms(rooms);

      return {
        messages: {
          ...state.messages,
          [message.roomId]: messages,
        },
        rooms: sorted,
        totalUnread: recalculateTotalUnread(sorted),
      };
    }),

  updateMessage: (roomId, messageId, updater) =>
    set((state) => {
      const roomMessages = state.messages[roomId] ?? [];
      const updatedMessages = roomMessages.map((message) =>
        message.id === messageId ? updater(message) : message,
      );

      const lastMessage = updatedMessages[updatedMessages.length - 1];
      const rooms = state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              lastMessage:
                room.lastMessage?.id === messageId ? lastMessage : room.lastMessage,
            }
          : room,
      );

      return {
        messages: {
          ...state.messages,
          [roomId]: updatedMessages,
        },
        rooms,
      };
    }),

  applyReadUpdate: (roomId, userId, lastReadAt, currentUserId) =>
    set((state) => {
      const rooms = state.rooms.map((room) => {
        if (room.id !== roomId) {
          return room;
        }

        return {
          ...room,
          unreadCount: userId === currentUserId ? 0 : room.unreadCount,
          members: room.members.map((member) =>
            member.userId === userId ? { ...member, lastReadAt } : member,
          ),
        };
      });

      return {
        rooms,
        totalUnread: recalculateTotalUnread(rooms),
      };
    }),

  setTyping: (roomId, user, isTyping) =>
    set((state) => {
      const current = state.typingUsers[roomId] ?? [];
      const withoutUser = current.filter((item) => item.userId !== user.userId);

      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: isTyping ? [...withoutUser, user] : withoutUser,
        },
      };
    }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setOpen: (open) => set({ isOpen: open }),

  clear: () =>
    set({
      rooms: [],
      activeRoomId: null,
      messages: {},
      nextCursorByRoom: {},
      loadingMessages: {},
      typingUsers: {},
      isOpen: false,
      totalUnread: 0,
    }),
}));
