'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRealtimeNotificationStore } from '@/stores/realtime-notification-store';
import { useNotificationStore } from '@/stores/notification-store';
import { getSocket, disconnectSocket, reconnectSocket } from '@/lib/socket';
import api from '@/lib/api';

// Generate UUID compatible with all browsers
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useWebSocket = () => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const addNotification = useRealtimeNotificationStore(
    (state) => state.addNotification,
  );
  const setNotifications = useRealtimeNotificationStore(
    (state) => state.setNotifications,
  );
  const setUnreadCount = useRealtimeNotificationStore(
    (state) => state.setUnreadCount,
  );
  const pushToast = useNotificationStore((state) => state.push);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    console.log('[useWebSocket] Effect running - user:', Boolean(user), 'token:', Boolean(accessToken));

    if (!user || !accessToken) {
      console.log('[useWebSocket] No user or token, disconnecting');
      disconnectSocket();
      return;
    }

    console.log('[useWebSocket] Initializing socket connection');
    // Initialize socket connection
    const socket = getSocket();
    socketRef.current = socket;

    // Load initial notifications
    const loadNotifications = async () => {
      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          api.get('/notifications?limit=50'),
          api.get('/notifications/unread-count'),
        ]);
        setNotifications(notificationsRes.data);
        setUnreadCount(unreadRes.data.count);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();

    // Listen for real-time notifications
    const handleNotification = (data: any) => {
      console.log('[useWebSocket] Received notification:', data);

      try {
        const newNotification = {
          id: generateUUID(),
          type: data.type,
          entityType: data.entityType,
          entityId: data.entityId,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
          read: false,
          createdAt: new Date().toISOString(),
        };

        console.log('[useWebSocket] Adding notification to store:', newNotification);
        addNotification(newNotification);

        // Toast removido - notificação aparece apenas no sino
        // Se quiser mostrar toast também, descomente abaixo:
        // pushToast({
        //   variant: 'info',
        //   title: data.title,
        //   message: data.message,
        // });

        console.log('[useWebSocket] ✅ Notification handled successfully');
      } catch (error) {
        console.error('[useWebSocket] ❌ Error handling notification:', error);
      }
    };

    socket.on('notification', handleNotification);

    // Cleanup on unmount: remove só ESTE handler, não todos os listeners
    // do evento (o socket é um singleton compartilhado).
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [
    user,
    accessToken,
    addNotification,
    setNotifications,
    setUnreadCount,
    pushToast,
  ]);

  // Reconnect when token changes
  useEffect(() => {
    if (user && accessToken && socketRef.current) {
      reconnectSocket();
    }
  }, [accessToken, user]);
};
