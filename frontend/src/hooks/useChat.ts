'use client';

import { useEffect } from 'react';
import { isAxiosError } from 'axios';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage, ChatMessagesResponse, ChatRoom, User } from '@/types';
import { isOwnChatMessage } from '@/components/chat/chat-helpers';

type TypingPayload = {
  roomId: string;
  userId: string;
  name: string;
  isTyping: boolean;
};

type ReadUpdatePayload = {
  roomId: string;
  userId: string;
  lastReadAt: string;
};

type EditedMessagePayload = {
  messageId: string;
  roomId: string;
  content: string;
  editedAt: string;
};

type DeletedMessagePayload = {
  messageId: string;
  roomId: string;
  deletedAt: string;
};

let boundSocket: ReturnType<typeof getSocket> | null = null;
const typingStartTimers = new Map<string, number>();
const typingStopTimers = new Map<string, number>();

const joinRooms = (rooms: ChatRoom[]) => {
  const socket = getSocket();
  if (!socket.connected) {
    return;
  }

  rooms.forEach((room) => {
    socket.emit('chat:join', { roomId: room.id });
  });
};

const refreshRooms = async () => {
  const response = await api.get('/chat/rooms', { skipNotify: true });
  const rooms = Array.isArray(response.data) ? (response.data as ChatRoom[]) : [];
  useChatStore.getState().setRooms(rooms);
  joinRooms(rooms);
  return rooms;
};

const handleSocketConnect = () => {
  void refreshRooms();
};

const handleRoomCreated = (room: ChatRoom) => {
  useChatStore.getState().upsertRoom(room);
  getSocket().emit('chat:join', { roomId: room.id });
};

const handleRoomRemoved = (payload: { roomId: string }) => {
  useChatStore.getState().removeRoom(payload.roomId);
};

const handleChatMessage = (message: ChatMessage) => {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  const { activeRoomId, isOpen, addMessage } = useChatStore.getState();

  addMessage(message, {
    incrementUnread:
      !isOwnChatMessage(message, currentUserId) &&
      (!isOpen || activeRoomId !== message.roomId),
  });
};

const handleTyping = (payload: TypingPayload) => {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  if (payload.userId === currentUserId) {
    return;
  }

  useChatStore.getState().setTyping(
    payload.roomId,
    { userId: payload.userId, name: payload.name },
    payload.isTyping,
  );
};

const handleReadUpdate = (payload: ReadUpdatePayload) => {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  useChatStore.getState().applyReadUpdate(
    payload.roomId,
    payload.userId,
    payload.lastReadAt,
    currentUserId,
  );
};

const handleMessageEdited = (payload: EditedMessagePayload) => {
  useChatStore.getState().updateMessage(payload.roomId, payload.messageId, (message) => ({
    ...message,
    content: payload.content,
    editedAt: payload.editedAt,
  }));
};

const handleMessageDeleted = (payload: DeletedMessagePayload) => {
  useChatStore.getState().updateMessage(payload.roomId, payload.messageId, (message) => ({
    ...message,
    deletedAt: payload.deletedAt,
  }));
};

const bindSocketListeners = () => {
  const socket = getSocket();

  if (boundSocket === socket) {
    return socket;
  }

  if (boundSocket) {
    boundSocket.off('connect', handleSocketConnect);
    boundSocket.off('chat:room-created', handleRoomCreated);
    boundSocket.off('chat:room-updated', handleRoomCreated);
    boundSocket.off('chat:room-removed', handleRoomRemoved);
    boundSocket.off('chat:message', handleChatMessage);
    boundSocket.off('chat:typing', handleTyping);
    boundSocket.off('chat:read-update', handleReadUpdate);
    boundSocket.off('chat:message-edited', handleMessageEdited);
    boundSocket.off('chat:message-deleted', handleMessageDeleted);
  }

  socket.on('connect', handleSocketConnect);
  socket.on('chat:room-created', handleRoomCreated);
  socket.on('chat:room-updated', handleRoomCreated);
  socket.on('chat:room-removed', handleRoomRemoved);
  socket.on('chat:message', handleChatMessage);
  socket.on('chat:typing', handleTyping);
  socket.on('chat:read-update', handleReadUpdate);
  socket.on('chat:message-edited', handleMessageEdited);
  socket.on('chat:message-deleted', handleMessageDeleted);

  boundSocket = socket;
  return socket;
};

const clearTypingTimer = (map: Map<string, number>, roomId: string) => {
  const timer = map.get(roomId);
  if (timer) {
    window.clearTimeout(timer);
    map.delete(roomId);
  }
};

const sendMessage = async (roomId: string, content: string) => {
  const response = await api.post(
    '/chat/messages',
    { roomId, content },
    { skipNotify: true },
  );
  const message = response.data as ChatMessage;
  useChatStore.getState().addMessage(message, { incrementUnread: false });
  return message;
};

const startTyping = (roomId: string) => {
  clearTypingTimer(typingStartTimers, roomId);
  clearTypingTimer(typingStopTimers, roomId);

  typingStartTimers.set(
    roomId,
    window.setTimeout(() => {
      bindSocketListeners().emit('chat:typing', { roomId, isTyping: true });
      typingStartTimers.delete(roomId);
    }, 300),
  );

  typingStopTimers.set(
    roomId,
    window.setTimeout(() => {
      bindSocketListeners().emit('chat:typing', { roomId, isTyping: false });
      typingStopTimers.delete(roomId);
    }, 2000),
  );
};

const stopTyping = (roomId: string) => {
  clearTypingTimer(typingStartTimers, roomId);
  clearTypingTimer(typingStopTimers, roomId);
  bindSocketListeners().emit('chat:typing', { roomId, isTyping: false });
};

const markRead = async (roomId: string) => {
  const currentUserId = useAuthStore.getState().user?.id ?? null;
  if (!currentUserId) {
    return;
  }

  try {
    const response = await api.patch(
      `/chat/rooms/${roomId}/read`,
      undefined,
      { skipNotify: true },
    );

    const payload = response.data as ReadUpdatePayload;
    useChatStore
      .getState()
      .applyReadUpdate(roomId, currentUserId, payload.lastReadAt, currentUserId);
  } catch (error) {
    // Remover a sala só quando o servidor confirma que ela não existe ou não
    // é nossa; erro transitório (rede, 401 durante refresh de token) NÃO pode
    // apagar a sala local — era a causa de grupos "sumindo" aleatoriamente.
    if (
      isAxiosError(error) &&
      (error.response?.status === 403 || error.response?.status === 404)
    ) {
      useChatStore.getState().removeRoom(roomId);
    }
  }
};

const loadMoreMessages = async (roomId: string, cursor?: string | null) => {
  const { loadingMessages, setRoomLoading, prependMessages, setRoomMessages } =
    useChatStore.getState();

  if (loadingMessages[roomId]) {
    return null;
  }

  try {
    setRoomLoading(roomId, true);
    const response = await api.get(`/chat/rooms/${roomId}/messages`, {
      params: {
        ...(cursor ? { cursor } : {}),
        limit: 50,
      },
      skipNotify: true,
    });

    const data = response.data as ChatMessagesResponse;
    if (cursor) {
      prependMessages(roomId, data.items, data.nextCursor);
    } else {
      setRoomMessages(roomId, data.items, data.nextCursor);
    }

    return data;
  } finally {
    setRoomLoading(roomId, false);
  }
};

const ensureRoomLoaded = async (roomId: string) => {
  const { loadingMessages } = useChatStore.getState();
  if (loadingMessages[roomId]) {
    return;
  }

  await loadMoreMessages(roomId);
};

const createDM = async (recipientId: string) => {
  const response = await api.post(
    '/chat/rooms/direct',
    { recipientId },
    { skipNotify: true },
  );
  const room = response.data as ChatRoom;
  useChatStore.getState().upsertRoom(room);
  useChatStore.getState().setActiveRoom(room.id);
  useChatStore.getState().setOpen(true);
  bindSocketListeners().emit('chat:join', { roomId: room.id });
  return room;
};

const createGroup = async (name: string, memberIds: string[]) => {
  const response = await api.post(
    '/chat/rooms/group',
    { name, memberIds },
    { skipNotify: true },
  );
  const room = response.data as ChatRoom;
  useChatStore.getState().upsertRoom(room);
  useChatStore.getState().setActiveRoom(room.id);
  useChatStore.getState().setOpen(true);
  bindSocketListeners().emit('chat:join', { roomId: room.id });
  return room;
};

const deleteRoom = async (roomId: string) => {
  await api.delete(`/chat/rooms/${roomId}`, { skipNotify: true });
  useChatStore.getState().removeRoom(roomId);
};

const editMessage = async (messageId: string, content: string) => {
  const response = await api.patch(
    `/chat/messages/${messageId}`,
    { content },
    { skipNotify: true },
  );
  const message = response.data as ChatMessage;
  useChatStore.getState().updateMessage(message.roomId, message.id, (current) => ({
    ...current,
    content: message.content,
    editedAt: message.editedAt,
  }));
  return message;
};

const deleteMessage = async (messageId: string) => {
  const response = await api.delete(`/chat/messages/${messageId}`, { skipNotify: true });
  const payload = response.data as DeletedMessagePayload;
  useChatStore
    .getState()
    .updateMessage(payload.roomId, payload.messageId, (message) => ({
      ...message,
      deletedAt: payload.deletedAt,
    }));
  return payload;
};

const loadUsers = async (search?: string) => {
  const response = await api.get('/chat/users', {
    params: search?.trim() ? { search: search.trim() } : undefined,
    skipNotify: true,
  });

  return (Array.isArray(response.data) ? response.data : []) as Pick<
    User,
    'id' | 'name' | 'email' | 'avatarUrl' | 'role'
  >[];
};

const chatActions = {
  refreshRooms,
  sendMessage,
  startTyping,
  stopTyping,
  markRead,
  loadMoreMessages,
  ensureRoomLoaded,
  createDM,
  createGroup,
  deleteRoom,
  editMessage,
  deleteMessage,
  loadUsers,
};

export const useChatRealtime = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!user || !accessToken) {
      useChatStore.getState().clear();
      return;
    }

    bindSocketListeners();
    void refreshRooms();
  }, [accessToken, user]);
};

export const useChat = () => chatActions;
