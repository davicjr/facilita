import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationVariant } from '@/stores/notification-store';

type NotifyOptions = {
  title?: string;
  duration?: number;
};

const pushNotification = (
  variant: NotificationVariant,
  message: string,
  options?: NotifyOptions,
) => {
  useNotificationStore.getState().push({
    variant,
    message,
    title: options?.title,
    duration: options?.duration,
  });
};

export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    pushNotification('success', message, options),
  error: (message: string, options?: NotifyOptions) =>
    pushNotification('error', message, options),
  info: (message: string, options?: NotifyOptions) =>
    pushNotification('info', message, options),
};
