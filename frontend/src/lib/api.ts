'use client';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { extractApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';

const getDefaultHost = () =>
  typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const getBaseURL = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return apiUrl;
  return `http://${getDefaultHost()}:3001/api`;
};

const getServerURL = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // If API URL is relative (e.g., /api), use current origin.
  if (apiUrl?.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  // If API URL is absolute, remove the /api suffix.
  if (apiUrl) {
    return apiUrl.replace('/api', '');
  }

  return `http://${getDefaultHost()}:3001`;
};

const baseURL = getBaseURL();

// Base URL do servidor (sem /api) para acesso a arquivos estáticos.
export const serverURL = getServerURL();

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

type NotificationConfig = RetryConfig & {
  skipNotify?: boolean;
};

const mutationMethods = new Set(['post', 'put', 'patch', 'delete']);
const ignoredNotifyPaths = ['/auth/refresh'];

const resolveEntityLabel = (url?: string) => {
  if (!url) return 'Operação';
  const normalized = url.toLowerCase();
  if (normalized.includes('/auth/login')) return 'Login';
  if (normalized.includes('/auth/logout')) return 'Logout';
  if (normalized.includes('/permissions')) return 'Permissões';
  if (normalized.includes('/links')) return 'Link';
  if (normalized.includes('/categories')) return 'Categoria';
  if (normalized.includes('/schedules')) return 'Documento';
  if (normalized.includes('/notes')) return 'Nota';
  if (normalized.includes('/users')) return 'Usuário';
  if (normalized.includes('/shares')) return 'Compartilhamento';
  if (normalized.includes('/uploads')) return 'Arquivo';
  if (normalized.includes('/system-config')) return 'Configurações';
  return 'Operação';
};

const resolveAction = (method?: string, url?: string) => {
  if (url?.includes('/auth/login') || url?.includes('/auth/logout')) {
    return { past: 'realizado', infinitive: 'realizar' };
  }
  if (url?.includes('/permissions')) {
    return { past: 'atualizadas', infinitive: 'atualizar' };
  }
  if (url?.includes('/restore')) {
    return { past: 'restaurado', infinitive: 'restaurar' };
  }

  switch (method) {
    case 'post':
      return { past: 'criado', infinitive: 'criar' };
    case 'put':
    case 'patch':
      return { past: 'atualizado', infinitive: 'atualizar' };
    case 'delete':
      return { past: 'removido', infinitive: 'remover' };
    default:
      return { past: 'salvo', infinitive: 'salvar' };
  }
};

const shouldNotify = (config?: NotificationConfig) => {
  const method = config?.method?.toLowerCase();
  if (!method || !mutationMethods.has(method)) return false;
  if (config?.skipNotify) return false;
  const url = config?.url ?? '';
  return !ignoredNotifyPaths.some((path) => url.includes(path));
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Single-flight: o backend ROTACIONA o refresh token — dois refresh
// concorrentes se invalidam mutuamente. Todos os 401 simultâneos devem
// aguardar a MESMA promessa de refresh, nunca disparar a sua própria.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const user = response.data?.user;
        if (user) {
          useAuthStore.getState().setUser(user);
        }
        const token = response.data.accessToken as string;
        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => {
    const config = response.config as NotificationConfig;
    if (shouldNotify(config)) {
      const entity = resolveEntityLabel(config.url);
      const action = resolveAction(config.method, config.url);
      const message =
        entity === 'Operação'
          ? 'Operação concluída.'
          : `${entity} ${action.past} com sucesso.`;

      useNotificationStore.getState().push({ variant: 'success', message });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as NotificationConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();

        // @ts-expect-error - headers is always defined in axios requests
        originalRequest.headers?.set('Authorization', `Bearer ${newAccessToken}`);

        return api(originalRequest);
      } catch (refreshError) {
        // Só derruba a sessão se o PRÓPRIO refresh foi rejeitado pelo
        // servidor; erro de rede/transitório não pode deslogar o usuário.
        const status = axios.isAxiosError(refreshError)
          ? refreshError.response?.status
          : undefined;
        if (status === 401 || status === 403) {
          useAuthStore.getState().clearAuth();
        }
      }
    }

    if (shouldNotify(originalRequest)) {
      const entity = resolveEntityLabel(originalRequest?.url);
      const action = resolveAction(
        originalRequest?.method,
        originalRequest?.url,
      );
      const fallback =
        entity === 'Operação'
          ? 'Não foi possível concluir a operação.'
          : `Falha ao ${action.infinitive.toLowerCase()} ${entity.toLowerCase()}.`;
      const message = extractApiErrorMessage(error) ?? fallback;

      useNotificationStore.getState().push({ variant: 'error', message });
    }

    return Promise.reject(error);
  },
);

export default api;
