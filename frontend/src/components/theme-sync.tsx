'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  applyThemeToDocument,
  getStoredTheme,
  getThemeStorageKey,
  LEGACY_THEME_STORAGE_KEY,
  useUiStore,
} from '@/stores/ui-store';

export default function ThemeSync() {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const authHydrated = useAuthStore((state) => state.hasHydrated);
  const hydrateTheme = useUiStore((state) => state.hydrateTheme);

  useEffect(() => {
    if (!authHydrated) {
      return;
    }

    const themeKey = getThemeStorageKey(userId);
    const hasUserTheme = typeof window !== 'undefined' && Boolean(localStorage.getItem(themeKey));
    const legacyTheme =
      typeof window !== 'undefined' ? localStorage.getItem(LEGACY_THEME_STORAGE_KEY) : null;

    if (userId && !hasUserTheme && (legacyTheme === 'light' || legacyTheme === 'dark')) {
      localStorage.setItem(themeKey, legacyTheme);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    }

    const nextTheme = getStoredTheme(userId);
    applyThemeToDocument(nextTheme);
    hydrateTheme(nextTheme);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== themeKey && event.key !== LEGACY_THEME_STORAGE_KEY) return;
      if (event.newValue === 'light' || event.newValue === 'dark') {
        applyThemeToDocument(event.newValue);
        hydrateTheme(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [authHydrated, hydrateTheme, userId]);

  return null;
}
