'use client';

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

let socket: Socket | null = null;

const getServerURL = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // If API URL is relative (e.g., /api), use current origin
  if (apiUrl?.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  // If API URL is absolute, remove /api suffix
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }

  // Fallback to default
  const defaultHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${defaultHost}:3001`;
};

export const getSocket = (): Socket => {
  if (!socket) {
    const serverURL = getServerURL();

    console.log('[WebSocket] Initializing connection to:', serverURL);

    socket = io(serverURL, {
      // auth como função: o token é lido do store a cada (re)conexão —
      // nunca fica congelado no valor de quando o socket foi criado.
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      // Nunca desistir: com attempts finitos o socket.io parava para sempre
      // após ~15s de instabilidade (deploy/rede) e o chat morria até um F5.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] ✅ Connected successfully! Socket ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] ❌ Disconnected. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] ⚠️ Connection error:', error);
    });

    socket.on('notification', (data) => {
      console.log('[WebSocket] 📬 Received notification:', data);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = () => {
  // O auth é dinâmico (função) — basta garantir que o socket esteja conectado.
  if (socket && !socket.connected) {
    socket.connect();
  }
};
