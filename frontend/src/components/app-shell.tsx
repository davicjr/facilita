'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import AppNav from '@/components/app-nav';
import GlobalSearch from '@/components/global-search';
import UserProfileModal from '@/components/user-profile-modal';
import UserNavMenu from './user-nav-menu';
import api from '@/lib/api';
import { canAccessPath, getFallbackPath } from '@/lib/permissions';
import {
  buildShortcutCombo,
  getKeyboardEventShortcutKeys,
  isActionShortcutTarget,
  isEditableKeyboardTarget,
  isInternalShortcutTarget,
  type ShortcutActionId,
} from '@/lib/shortcuts';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  NAV_WIDTH_DEFAULT,
  NAV_WIDTH_MAX,
  NAV_WIDTH_MIN,
  PAGE_HEIGHT_MIN,
  PAGE_WIDTH_DEFAULT,
  useUiStore,
} from '@/stores/ui-store';

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navCollapsed = useUiStore((state) => state.navCollapsed);
  const navMode = useUiStore((state) => state.navMode);
  const navWidth = useUiStore((state) => state.navWidth);
  const toggleNavCollapsed = useUiStore((state) => state.toggleNavCollapsed);
  const toggleNavMode = useUiStore((state) => state.toggleNavMode);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setNavWidth = useUiStore((state) => state.setNavWidth);
  const resetNavWidth = useUiStore((state) => state.resetNavWidth);
  const pageWidth = useUiStore((state) => state.pageWidth);
  const setPageWidth = useUiStore((state) => state.setPageWidth);
  const resetPageWidth = useUiStore((state) => state.resetPageWidth);
  const pageHeight = useUiStore((state) => state.pageHeight);
  const setPageHeight = useUiStore((state) => state.setPageHeight);
  const resetPageHeight = useUiStore((state) => state.resetPageHeight);
  const shortcutCatalog = useUiStore((state) => state.shortcutCatalog);
  const setShortcutCatalog = useUiStore((state) => state.setShortcutCatalog);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navResizing, setNavResizing] = useState(false);
  const [pageResizeMode, setPageResizeMode] = useState<'width' | 'height' | 'both' | null>(null);
  const [navHovered, setNavHovered] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const navResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const pageResizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  const pageWrapRef = useRef<HTMLDivElement>(null);

  const closeGlobalSearch = () => setGlobalSearchOpen(false);

  useEffect(() => {
    if (!hasHydrated || !accessToken) return;
    let active = true;

    const syncUser = async () => {
      try {
        const response = await api.get('/auth/me');
        if (active) {
          setUser(response.data);
        }
      } catch {
        if (active) {
          clearAuth();
        }
      }
    };

    void syncUser();
    return () => {
      active = false;
    };
  }, [accessToken, clearAuth, hasHydrated, setUser]);

  useEffect(() => {
    if (!hasHydrated || !accessToken || !user) {
      setShortcutCatalog([]);
      return;
    }

    let active = true;

    const loadShortcutCatalog = async () => {
      try {
        const response = await api.get('/system-config/shortcuts/catalog', {
          skipNotify: true,
        });

        if (active) {
          setShortcutCatalog(Array.isArray(response.data) ? response.data : []);
        }
      } catch {
        if (active) {
          setShortcutCatalog([]);
        }
      }
    };

    void loadShortcutCatalog();
    return () => {
      active = false;
    };
  }, [accessToken, hasHydrated, setShortcutCatalog, user]);

  useEffect(() => {
    if (!navResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!navResizeRef.current) return;
      const delta = event.clientX - navResizeRef.current.startX;
      setNavWidth(navResizeRef.current.startWidth + delta);
    };

    const handlePointerUp = () => {
      navResizeRef.current = null;
      setNavResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [navResizing, setNavWidth]);

  useEffect(() => {
    if (!pageResizeMode) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (pageResizeMode === 'width' || pageResizeMode === 'both') {
        const deltaX = event.clientX - pageResizeRef.current.startX;
        setPageWidth(pageResizeRef.current.startWidth + deltaX);
      }

      if (pageResizeMode === 'height' || pageResizeMode === 'both') {
        const deltaY = event.clientY - pageResizeRef.current.startY;
        setPageHeight(pageResizeRef.current.startHeight + deltaY);
      }
    };

    const handlePointerUp = () => {
      setPageResizeMode(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor =
      pageResizeMode === 'width' ? 'ew-resize' : pageResizeMode === 'height' ? 'ns-resize' : 'nwse-resize';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [pageResizeMode, setPageHeight, setPageWidth]);

  const executeAction = useEffectEvent((actionId: ShortcutActionId) => {
    switch (actionId) {
      case 'action:open_search':
        setGlobalSearchOpen(true);
        break;
      case 'action:toggle_theme':
        toggleTheme();
        break;
      case 'action:toggle_nav':
        toggleNavCollapsed();
        break;
      case 'action:toggle_nav_mode':
        toggleNavMode();
        break;
      case 'action:logout':
        clearAuth();
        router.push('/login');
        break;
    }
  });

  const handleGlobalSearchHotkey = useEffectEvent((event: KeyboardEvent) => {
    if (!user) {
      return;
    }

    if (isEditableKeyboardTarget(event.target)) {
      return;
    }

    const keys = getKeyboardEventShortcutKeys(event);
    if (!keys) {
      return;
    }

    const combo = buildShortcutCombo(keys);

    const matchedShortcut = shortcutCatalog.find(
      (shortcut) => buildShortcutCombo(shortcut.keys) === combo,
    );

    if (!matchedShortcut) {
      return;
    }

    event.preventDefault();

    if (isActionShortcutTarget(matchedShortcut.target)) {
      executeAction(matchedShortcut.target);
      return;
    }

    if (isInternalShortcutTarget(matchedShortcut.target) && !matchedShortcut.openInNewTab) {
      router.push(matchedShortcut.target);
      return;
    }

    if (matchedShortcut.openInNewTab) {
      window.open(matchedShortcut.target, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isInternalShortcutTarget(matchedShortcut.target)) {
      window.open(matchedShortcut.target, '_self');
      return;
    }

    window.location.assign(matchedShortcut.target);
  });

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalSearchHotkey);
    return () => window.removeEventListener('keydown', handleGlobalSearchHotkey);
  }, []);

  const handleNavResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (navMode === 'manual' && navCollapsed) return;

    navResizeRef.current = {
      startX: event.clientX,
      startWidth: navWidth,
    };
    setNavResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };

  const handlePageResizeStart =
    (mode: 'width' | 'height' | 'both') => (event: React.PointerEvent<HTMLButtonElement>) => {
      const currentHeight =
        pageHeight ?? pageWrapRef.current?.getBoundingClientRect().height ?? PAGE_HEIGHT_MIN;

      pageResizeRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startWidth: pageWidth,
        startHeight: currentHeight,
      };
      setPageResizeMode(mode);
      event.preventDefault();
    };

  const navEffectiveCollapsed =
    navMode === 'auto' ? !(navHovered || navResizing) : navCollapsed;

  // Full bidirectional smoothstep: shrinks below DEFAULT, grows above DEFAULT
  const _lo = -((NAV_WIDTH_DEFAULT - NAV_WIDTH_MIN) / (NAV_WIDTH_MAX - NAV_WIDTH_DEFAULT));
  const _t = Math.min(1, Math.max(_lo, (navWidth - NAV_WIDTH_DEFAULT) / (NAV_WIDTH_MAX - NAV_WIDTH_DEFAULT)));
  const _a = Math.abs(_t);
  const navFontGrow = Math.sign(_t) * _a * _a * (3 - 2 * _a);

  const mainGridStyle = user
    ? ({
        '--fac-sidebar-width': `${navWidth}px`,
        '--fac-sidebar-grow': `${navFontGrow}`,
      } as CSSProperties)
    : undefined;

  const canAccessCurrentPath = !user || canAccessPath(user, pathname);

  // Sessão perdida/expirada: sem isto, uma rota protegida que recebe 401 (após
  // o refresh falhar e limpar o auth) ficava presa exibindo "Unauthorized",
  // sem caminho de volta. O home '/' é a landing pública e não redireciona.
  useEffect(() => {
    if (!hasHydrated || accessToken || pathname === '/') {
      return;
    }

    const next = encodeURIComponent(pathname);
    router.replace(`/login?next=${next}`);
  }, [accessToken, hasHydrated, pathname, router]);

  useEffect(() => {
    if (!hasHydrated || !user || canAccessCurrentPath) {
      return;
    }

    const fallbackPath = getFallbackPath(user) ?? '/';
    if (fallbackPath !== pathname) {
      router.replace(fallbackPath);
    }
  }, [canAccessCurrentPath, hasHydrated, pathname, router, user]);

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      {user ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden={!mobileMenuOpen}
            className={cn('fac-mobile-nav-backdrop lg:hidden', mobileMenuOpen && 'is-open')}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className={cn('fac-mobile-nav-drawer lg:hidden', mobileMenuOpen && 'is-open')}
            aria-hidden={!mobileMenuOpen}
          >
            <AppNav onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </>
      ) : null}
      <div className={`fac-shell flex-1 ${user ? 'fac-shell-with-nav' : ''}`}>
        <div
          className={
            user
              ? `fac-main-grid ${navEffectiveCollapsed ? 'fac-main-grid-collapsed' : ''}`
              : ''
          }
          style={mainGridStyle}
        >
          {user ? (
            <aside
              className="hidden lg:block lg:relative lg:h-full"
              onMouseEnter={() => {
                if (navMode === 'auto') {
                  setNavHovered(true);
                }
              }}
              onMouseLeave={() => {
                if (navMode === 'auto') {
                  setNavHovered(false);
                }
              }}
            >
              <AppNav
                collapsed={navEffectiveCollapsed}
                onToggleCollapse={navMode === 'manual' ? toggleNavCollapsed : undefined}
                navMode={navMode}
              />
              {!navEffectiveCollapsed ? (
                <button
                  type="button"
                  className={cn('fac-nav-resizer', navResizing && 'is-resizing')}
                  onPointerDown={handleNavResizeStart}
                  onDoubleClick={resetNavWidth}
                  aria-label="Ajustar largura da barra lateral"
                  title={`Arraste para ajustar a largura. Duplo clique para voltar a ${NAV_WIDTH_DEFAULT}px.`}
                />
              ) : null}
            </aside>
          ) : null}
          <main className={`fac-outlet ${user ? 'fac-main-content' : ''}`}>
            {!canAccessCurrentPath ? (
              <div className="fac-loading-state">Redirecionando...</div>
            ) : user ? (
              <div className="fac-page-resize-outer" style={{ maxWidth: `${pageWidth}px` }}>
                <div
                  ref={pageWrapRef}
                  className={cn('fac-page-resize-wrap', pageHeight && 'is-height-limited')}
                  style={{
                    maxHeight: pageHeight ? `${pageHeight}px` : undefined,
                    overflowY: pageHeight ? 'auto' : undefined,
                  }}
                >
                  {children}
                </div>
                <button
                  type="button"
                  className={cn(
                    'fac-page-resizer fac-page-resizer-x',
                    pageResizeMode === 'width' && 'is-resizing',
                  )}
                  onPointerDown={handlePageResizeStart('width')}
                  onDoubleClick={resetPageWidth}
                  aria-label="Ajustar largura do conteúdo"
                  title={`Arraste para ajustar a largura. Duplo clique para voltar a ${PAGE_WIDTH_DEFAULT}px.`}
                />
                <button
                  type="button"
                  className={cn(
                    'fac-page-resizer fac-page-resizer-y',
                    pageResizeMode === 'height' && 'is-resizing',
                  )}
                  onPointerDown={handlePageResizeStart('height')}
                  onDoubleClick={resetPageHeight}
                  aria-label="Ajustar altura do conteúdo"
                  title="Arraste para ajustar a altura. Duplo clique para remover o limite."
                />
                <button
                  type="button"
                  className={cn(
                    'fac-page-resizer fac-page-resizer-corner',
                    pageResizeMode === 'both' && 'is-resizing',
                  )}
                  onPointerDown={handlePageResizeStart('both')}
                  onDoubleClick={() => {
                    resetPageWidth();
                    resetPageHeight();
                  }}
                  aria-label="Ajustar largura e altura do conteúdo"
                  title="Arraste para ajustar largura e altura"
                />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>

      <footer className="border-t border-border bg-white/85 dark:bg-background/90">
        <div className="flex min-h-[48px] w-full items-center justify-between px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span />
          <span>&copy; {new Date().getFullYear()} Todos os direitos reservados</span>
        </div>
      </footer>

      {user ? (
        <UserNavMenu
          navMode={navMode}
          mobileMenuOpen={mobileMenuOpen}
          onToggleNavMode={toggleNavMode}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          onOpenProfile={() => setProfileOpen(true)}
        />
      ) : null}
      {user ? <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} /> : null}
      {user ? <GlobalSearch open={globalSearchOpen} onClose={closeGlobalSearch} /> : null}
    </div>
  );
}
