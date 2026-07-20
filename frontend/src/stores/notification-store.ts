import { create } from 'zustand';

export type NotificationVariant = 'success' | 'error' | 'info';

export type NotificationToast = {
  id: string;
  title?: string;
  message: string;
  variant: NotificationVariant;
  createdAt: number;
  duration: number;
};

type NotificationState = {
  notifications: NotificationToast[];
  push: (toast: Omit<NotificationToast, 'id' | 'createdAt' | 'duration'> & {
    id?: string;
    duration?: number;
  }) => string;
  remove: (id: string) => void;
  clear: () => void;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.round(Math.random() * 10000)}`;
};

const MAX_TOASTS = 4;
const DEFAULT_DURATION = 4200;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  push: (toast) => {
    const id = toast.id ?? createId();
    const notification: NotificationToast = {
      id,
      title: toast.title,
      message: toast.message,
      variant: toast.variant,
      createdAt: Date.now(),
      duration: toast.duration ?? DEFAULT_DURATION,
    };

    set((state) => {
      const next = [...state.notifications, notification];
      return {
        notifications:
          next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next,
      };
    });

    return id;
  },
  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((toast) => toast.id !== id),
    })),
  clear: () => set({ notifications: [] }),
}));
