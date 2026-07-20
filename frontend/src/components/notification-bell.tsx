'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import api from '@/lib/api';
import { useRealtimeNotificationStore } from '@/stores/realtime-notification-store';
import type { RealtimeNotification } from '@/stores/realtime-notification-store';

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const notifications = useRealtimeNotificationStore((state) => state.notifications);
  const unreadCount = useRealtimeNotificationStore((state) => state.unreadCount);
  const markAsRead = useRealtimeNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useRealtimeNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useRealtimeNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', onClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  const handleNotificationClick = async (notification: RealtimeNotification) => {
    try {
      if (!notification.read) {
        await api.patch(`/notifications/${notification.id}/read`);
        markAsRead(notification.id);
      }

      setOpen(false);
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
    } catch {
      // noop
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllAsRead();
    } catch {
      // noop
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      removeNotification(id);
    } catch {
      // noop
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fac-icon-button"
        aria-label="Abrir notificacoes"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fac-panel absolute right-0 top-[52px] z-40 w-[360px] overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.15)]">
          <div className="fac-panel-head !py-3">
            <p className="fac-panel-title">Notificacoes</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                Marcar tudo
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                Nenhuma notificacao.
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`group flex cursor-pointer items-start gap-3 border-t border-border px-4 py-3 hover:bg-muted/25 ${
                      !notification.read ? 'bg-blue-50/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div
                      className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        notification.read ? 'bg-transparent' : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-[12px] text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                        {new Date(notification.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleDelete(notification.id, event)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      aria-label="Excluir notificacao"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

