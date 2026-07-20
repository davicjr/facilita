'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import AdminModal from '@/components/admin/modal';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  useRealtimeNotificationStore,
  type RealtimeNotification,
} from '@/stores/realtime-notification-store';

type UserNotificationsModalProps = {
  open: boolean;
  onClose: () => void;
};

const formatNotificationDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR');

export default function UserNotificationsModal({
  open,
  onClose,
}: UserNotificationsModalProps) {
  const router = useRouter();
  const notifications = useRealtimeNotificationStore((state) => state.notifications);
  const unreadCount = useRealtimeNotificationStore((state) => state.unreadCount);
  const loading = useRealtimeNotificationStore((state) => state.loading);
  const setNotifications = useRealtimeNotificationStore(
    (state) => state.setNotifications,
  );
  const setUnreadCount = useRealtimeNotificationStore(
    (state) => state.setUnreadCount,
  );
  const setLoading = useRealtimeNotificationStore((state) => state.setLoading);
  const markAsRead = useRealtimeNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useRealtimeNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useRealtimeNotificationStore(
    (state) => state.removeNotification,
  );

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const [notificationsRes, unreadRes] = await Promise.all([
          api.get('/notifications?limit=50'),
          api.get('/notifications/unread-count'),
        ]);

        if (!active) return;

        setNotifications(notificationsRes.data);
        setUnreadCount(unreadRes.data.count);
      } catch {
        // Ignore refresh failures and keep the current store snapshot.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      active = false;
    };
  }, [open, setLoading, setNotifications, setUnreadCount]);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [notifications],
  );

  const handleOpenNotification = async (notification: RealtimeNotification) => {
    try {
      if (!notification.read) {
        await api.patch(`/notifications/${notification.id}/read`);
        markAsRead(notification.id);
      }

      if (notification.actionUrl) {
        onClose();
        router.push(notification.actionUrl);
      }
    } catch {
      // Ignore notification interaction failures.
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      markAllAsRead();
    } catch {
      // Ignore mark all failures.
    }
  };

  const handleMarkAsRead = async (
    notification: RealtimeNotification,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    try {
      await api.patch(`/notifications/${notification.id}/read`);
      markAsRead(notification.id);
    } catch {
      // Ignore mark read failures.
    }
  };

  const handleDelete = async (
    notification: RealtimeNotification,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    try {
      await api.delete(`/notifications/${notification.id}`);
      removeNotification(notification.id);
    } catch {
      // Ignore delete failures.
    }
  };

  return (
    <AdminModal
      open={open}
      title="Notificacoes"
      description="Acompanhe seus alertas recentes."
      onClose={onClose}
      panelClassName="max-w-[720px]"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} pendente${unreadCount === 1 ? '' : 's'}`
              : 'Tudo em dia'}
          </p>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="fac-button-secondary !h-9 !px-3 text-[10px]"
            >
              Marcar todas
            </button>
          ) : null}
        </div>

        {loading && sortedNotifications.length === 0 ? (
          <div className="fac-form-card flex min-h-[220px] items-center justify-center text-[13px] text-muted-foreground">
            Carregando notificacoes...
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="fac-form-card flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-[14px] font-semibold text-foreground">Nada novo por aqui</p>
            <p className="max-w-[320px] text-[12px] text-muted-foreground">
              Quando houver atividade relevante, ela vai aparecer nesta central.
            </p>
          </div>
        ) : (
          <div className="max-h-[58vh] space-y-2 overflow-y-auto pr-1">
            {sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[18px] border px-4 py-4 transition',
                  notification.read
                    ? 'border-border/70 bg-white/35 hover:border-border hover:bg-white/55 dark:bg-secondary/35 dark:hover:bg-secondary/55'
                    : 'border-primary/25 bg-primary/[0.08] hover:border-primary/35 hover:bg-primary/[0.12]',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className="flex min-w-0 items-start gap-3 text-left"
                >
                  <span
                    className={cn(
                      'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full',
                      notification.read ? 'bg-border/70' : 'bg-primary',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {notification.title}
                      </span>
                      {!notification.read ? (
                        <span className="rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
                          Nova
                        </span>
                      ) : null}
                    </span>

                    <span className="mt-1 block line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                      {notification.message?.trim() || 'Sem detalhes adicionais.'}
                    </span>

                    <span className="mt-2 block text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-start gap-2">
                  {!notification.read ? (
                    <button
                      type="button"
                      onClick={(event) => handleMarkAsRead(notification, event)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-border/70 px-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                    >
                      Lida
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={(event) => handleDelete(notification, event)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted-foreground transition hover:border-destructive/25 hover:bg-destructive/5 hover:text-destructive"
                    aria-label={`Excluir notificacao ${notification.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminModal>
  );
}
