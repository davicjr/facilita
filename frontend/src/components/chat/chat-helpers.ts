'use client';

import type { ChatMessage, ChatRoom } from '@/types';

export const getChatRoomCounterpart = (
  room: ChatRoom,
  currentUserId?: string | null,
) => room.members.find((member) => member.userId !== currentUserId)?.user;

export const getChatRoomTitle = (
  room: ChatRoom,
  currentUserId?: string | null,
) => {
  if (room.type === 'GROUP') {
    return room.name?.trim() || 'Grupo sem nome';
  }

  const counterpart = getChatRoomCounterpart(room, currentUserId);
  return counterpart?.name?.trim() || counterpart?.email || 'Conversa direta';
};

export const getChatRoomDescription = (
  room: ChatRoom,
  currentUserId?: string | null,
) => {
  if (room.type === 'GROUP') {
    return `${room.members.length} participante${room.members.length === 1 ? '' : 's'}`;
  }

  const counterpart = getChatRoomCounterpart(room, currentUserId);
  return counterpart?.email || 'Conversa privada';
};

export const IS_SERVER_IMAGE = /^\/uploads\/images\//i;
export const IS_SERVER_DOCUMENT = /^\/uploads\/(documents?|files?)\//i;
export const IS_IMAGE_URL = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?[^\s]*)?$/i;

export const detectMessageKind = (
  content: string,
): 'server-image' | 'server-file' | 'external-image' | 'text' => {
  const t = content.trim();
  if (IS_SERVER_IMAGE.test(t)) return 'server-image';
  if (IS_SERVER_DOCUMENT.test(t)) return 'server-file';
  if (IS_IMAGE_URL.test(t)) return 'external-image';
  return 'text';
};

export const getChatMessagePreview = (message?: ChatMessage) => {
  if (!message) return 'Nenhuma mensagem ainda.';
  if (message.deletedAt) return 'Mensagem apagada';

  const kind = detectMessageKind(message.content);
  if (kind === 'server-image' || kind === 'external-image') return '📷 Foto';
  if (kind === 'server-file') return '📎 Arquivo';

  return message.content;
};

const normalizeChatIdentity = (value?: string | null) => value?.trim().toLowerCase() ?? '';

export const isOwnChatMessage = (
  message: Pick<ChatMessage, 'senderId' | 'sender'>,
  currentUserId?: string | null,
) => {
  const normalizedCurrentUserId = normalizeChatIdentity(currentUserId);

  if (!normalizedCurrentUserId) {
    return false;
  }

  return (
    normalizeChatIdentity(message.senderId) === normalizedCurrentUserId ||
    normalizeChatIdentity(message.sender?.id) === normalizedCurrentUserId
  );
};

export const formatChatTimestamp = (value?: string | null) => {
  if (!value) return '';

  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat('pt-BR', {
    ...(isSameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit' }),
  }).format(date);
};

export const formatDateSeparator = (value: string): string => {
  const date = new Date(value);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (dateMidnight === todayMidnight) return 'Hoje';
  if (dateMidnight === todayMidnight - 86400000) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const isSameDateDay = (a: string, b: string): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

/** Two messages are "grouped" if same sender and less than 5 min apart. */
export const shouldGroupWithPrev = (
  current: ChatMessage,
  prev: ChatMessage | undefined,
): boolean => {
  if (!prev || prev.senderId !== current.senderId || prev.deletedAt) return false;
  return (
    new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime() <
    5 * 60 * 1000
  );
};
