type ApiErrorPayload = {
  response?: {
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
};

export function extractApiErrorMessage(error: unknown): string | null {
  const payload = error as ApiErrorPayload;
  const message = payload.response?.data?.message;

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    const text = message.filter((item): item is string => typeof item === 'string').join(', ');
    return text || null;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return null;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return extractApiErrorMessage(error) ?? fallback;
}
