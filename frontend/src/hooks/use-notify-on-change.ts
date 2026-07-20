import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationVariant } from '@/stores/notification-store';

type NotifyOptions = {
  variant?: NotificationVariant;
  title?: string;
  duration?: number;
};

export default function useNotifyOnChange(
  message: string | null,
  options?: NotifyOptions,
) {
  const push = useNotificationStore((state) => state.push);
  const lastMessage = useRef<string | null>(null);
  const { variant = 'error', title, duration } = options ?? {};

  useEffect(() => {
    if (!message) {
      lastMessage.current = null;
      return;
    }

    if (message === lastMessage.current) return;
    lastMessage.current = message;

    push({ variant, title, message, duration });
  }, [duration, message, push, title, variant]);
}
