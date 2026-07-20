'use client';

import api from '@/lib/api';

function parseContentDispositionFilename(header?: string | null) {
  if (!header) return null;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const fallbackMatch = header.match(/filename="([^"]+)"/i) || header.match(/filename=([^;]+)/i);
  return fallbackMatch?.[1]?.trim() || null;
}

export async function downloadScheduleFile(scheduleId: string, fallbackName?: string) {
  const response = await api.get(`/schedules/${scheduleId}/download`, {
    responseType: 'blob',
    skipNotify: true,
  });

  const contentType = response.headers['content-type'];
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: typeof contentType === 'string' ? contentType : undefined,
        });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    parseContentDispositionFilename(response.headers['content-disposition']) ||
    fallbackName ||
    'documento';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
