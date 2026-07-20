import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';
import type { CustomShortcut } from '@/types';

export type Theme = 'light' | 'dark';
export type NavMode = 'manual' | 'auto';
export const NAV_WIDTH_DEFAULT = 272;
export const NAV_WIDTH_MIN = 200;
export const NAV_WIDTH_MAX = 420;
export const PAGE_WIDTH_DEFAULT = 1360;
export const PAGE_WIDTH_MIN = 860;
export const PAGE_WIDTH_MAX = 3100;
export const PAGE_HEIGHT_MIN = 320;
export const PAGE_HEIGHT_MAX = 3600;
export const THEME_STORAGE_PREFIX = 'facilita:theme';
export const LEGACY_THEME_STORAGE_KEY = 'theme';

const clampNavWidth = (value: number) =>
  Math.min(NAV_WIDTH_MAX, Math.max(NAV_WIDTH_MIN, value));

const clampPageWidth = (value: number) =>
  Math.min(PAGE_WIDTH_MAX, Math.max(PAGE_WIDTH_MIN, value));

const clampPageHeight = (value: number) =>
  Math.min(PAGE_HEIGHT_MAX, Math.max(PAGE_HEIGHT_MIN, value));

export const getThemeStorageKey = (userId?: string | null) =>
  `${THEME_STORAGE_PREFIX}:${userId ?? 'guest'}`;

export const applyThemeToDocument = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const getStoredTheme = (userId?: string | null): Theme => {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(getThemeStorageKey(userId));
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  if (!userId) {
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      return legacy;
    }
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export const persistTheme = (theme: Theme, userId?: string | null) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getThemeStorageKey(userId), theme);
};

const getInitialNavCollapsed = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('fac-nav-collapsed') === 'true';
};

const getInitialNavWidth = () => {
  if (typeof window === 'undefined') return NAV_WIDTH_DEFAULT;

  const stored = Number(localStorage.getItem('fac-nav-width'));
  return Number.isFinite(stored) ? clampNavWidth(stored) : NAV_WIDTH_DEFAULT;
};

const getInitialNavMode = (): NavMode => {
  if (typeof window === 'undefined') return 'manual';
  return localStorage.getItem('fac-nav-mode') === 'auto' ? 'auto' : 'manual';
};

const getInitialPageWidth = () => {
  if (typeof window === 'undefined') return PAGE_WIDTH_DEFAULT;

  const stored = Number(localStorage.getItem('fac-page-width'));
  return Number.isFinite(stored) && stored > 0 ? clampPageWidth(stored) : PAGE_WIDTH_DEFAULT;
};

const getInitialPageHeight = (): number | null => {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('fac-page-height');
  if (!stored || stored === 'auto') return null;

  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed > 0 ? clampPageHeight(parsed) : null;
};

type UiState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  navCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
  toggleNavCollapsed: () => void;
  navMode: NavMode;
  setNavMode: (mode: NavMode) => void;
  toggleNavMode: () => void;
  navWidth: number;
  setNavWidth: (width: number) => void;
  resetNavWidth: () => void;
  pageWidth: number;
  setPageWidth: (width: number) => void;
  resetPageWidth: () => void;
  pageHeight: number | null;
  setPageHeight: (height: number) => void;
  resetPageHeight: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  shortcutCatalog: CustomShortcut[];
  setShortcutCatalog: (items: CustomShortcut[]) => void;
  theme: Theme;
  hydrateTheme: (theme: Theme) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  navCollapsed: getInitialNavCollapsed(),
  setNavCollapsed: (collapsed) => {
    localStorage.setItem('fac-nav-collapsed', String(collapsed));
    set({ navCollapsed: collapsed });
  },
  toggleNavCollapsed: () =>
    set((state) => {
      const next = !state.navCollapsed;
      localStorage.setItem('fac-nav-collapsed', String(next));
      return { navCollapsed: next };
    }),
  navMode: getInitialNavMode(),
  setNavMode: (mode) => {
    localStorage.setItem('fac-nav-mode', mode);
    set({ navMode: mode });
  },
  toggleNavMode: () =>
    set((state) => {
      const next: NavMode = state.navMode === 'manual' ? 'auto' : 'manual';
      localStorage.setItem('fac-nav-mode', next);
      return { navMode: next };
    }),
  navWidth: getInitialNavWidth(),
  setNavWidth: (width) => {
    const next = clampNavWidth(width);
    localStorage.setItem('fac-nav-width', String(next));
    set({ navWidth: next });
  },
  resetNavWidth: () => {
    localStorage.setItem('fac-nav-width', String(NAV_WIDTH_DEFAULT));
    set({ navWidth: NAV_WIDTH_DEFAULT });
  },
  pageWidth: getInitialPageWidth(),
  setPageWidth: (width) => {
    const next = clampPageWidth(width);
    localStorage.setItem('fac-page-width', String(next));
    set({ pageWidth: next });
  },
  resetPageWidth: () => {
    localStorage.setItem('fac-page-width', String(PAGE_WIDTH_DEFAULT));
    set({ pageWidth: PAGE_WIDTH_DEFAULT });
  },
  pageHeight: getInitialPageHeight(),
  setPageHeight: (height) => {
    const next = clampPageHeight(height);
    localStorage.setItem('fac-page-height', String(next));
    set({ pageHeight: next });
  },
  resetPageHeight: () => {
    localStorage.setItem('fac-page-height', 'auto');
    set({ pageHeight: null });
  },
  globalSearch: '',
  setGlobalSearch: (q) => set({ globalSearch: q }),
  shortcutCatalog: [],
  setShortcutCatalog: (items) => set({ shortcutCatalog: items }),
  theme: getStoredTheme(),
  hydrateTheme: (theme) => {
    applyThemeToDocument(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    const currentUserId = useAuthStore.getState().user?.id ?? null;
    persistTheme(theme, currentUserId);
    applyThemeToDocument(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      const currentUserId = useAuthStore.getState().user?.id ?? null;
      persistTheme(nextTheme, currentUserId);
      applyThemeToDocument(nextTheme);
      return { theme: nextTheme };
    }),
}));
