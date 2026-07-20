'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useNotificationStore,
  type NotificationToast,
  type NotificationVariant,
} from '@/stores/notification-store';

type VariantStyle = {
  dot: string;
  progressBar: string;
  tone: string;
  title: string;
};

const variantStyles: Record<NotificationVariant, VariantStyle> = {
  success: {
    dot: 'bg-emerald-500',
    progressBar: 'bg-emerald-500',
    tone: 'text-emerald-700',
    title: 'Sucesso',
  },
  error: {
    dot: 'bg-destructive',
    progressBar: 'bg-destructive',
    tone: 'text-destructive',
    title: 'Erro',
  },
  info: {
    dot: 'bg-foreground/40',
    progressBar: 'bg-foreground/40',
    tone: 'text-muted-foreground',
    title: 'Aviso',
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: NotificationToast;
  onRemove: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const variant = variantStyles[toast.variant];
  const title = toast.title ?? variant.title;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-border/20">
        <div
          className={`h-full transition-all duration-75 ease-linear ${variant.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 pb-3">
        <span
          className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${variant.dot}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={`text-[9px] font-semibold uppercase tracking-wider ${variant.tone}`}>
            {title}
          </p>
          <p className="text-xs font-medium text-foreground leading-snug">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="motion-press shrink-0 rounded p-1 text-muted-foreground/60 transition hover:bg-muted/50 hover:text-foreground"
          aria-label="Fechar notificação"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function NotificationStack() {
  const notifications = useNotificationStore((state) => state.notifications);
  const remove = useNotificationStore((state) => state.remove);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    const activeIds = new Set(notifications.map((toast) => toast.id));

    Object.keys(timers.current).forEach((id) => {
      if (!activeIds.has(id)) {
        clearTimeout(timers.current[id]);
        delete timers.current[id];
      }
    });

    notifications.forEach((toast) => {
      if (timers.current[toast.id]) return;
      timers.current[toast.id] = window.setTimeout(() => {
        remove(toast.id);
        delete timers.current[toast.id];
      }, toast.duration);
    });
  }, [notifications, remove]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((timer) => clearTimeout(timer));
      timers.current = {};
    };
  }, []);

  if (!notifications.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9998] flex w-full max-w-xs flex-col gap-2 sm:bottom-6 sm:right-6">
      {notifications.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
      ))}
    </div>
  );
}
