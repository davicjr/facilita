'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  X,
} from 'lucide-react';
import UserNotificationsModal from '@/components/user-notifications-modal';
import UserAvatar from '@/components/user-avatar';
import api from '@/lib/api';
import {
  formatChatTimestamp,
  getChatMessagePreview,
  getChatRoomTitle,
} from '@/components/chat/chat-helpers';
import { getUserRoleLabel } from '@/lib/user-role';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useRealtimeNotificationStore } from '@/stores/realtime-notification-store';
import { type NavMode, useUiStore } from '@/stores/ui-store';

type UserNavMenuProps = {
  navMode: NavMode;
  mobileMenuOpen: boolean;
  onToggleNavMode: () => void;
  onToggleMobileMenu: () => void;
  onOpenProfile: () => void;
};

export default function UserNavMenu(props: UserNavMenuProps) {
  const { navMode, onToggleNavMode, onOpenProfile } = props;
  const user = useAuthStore((state) => state.user);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const globalSearch = useUiStore((state) => state.globalSearch);
  const setGlobalSearch = useUiStore((state) => state.setGlobalSearch);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const chatRooms = useChatStore((state) => state.rooms);
  const chatUnreadCount = useChatStore((state) => state.totalUnread);
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const unreadCount = useRealtimeNotificationStore((state) => state.unreadCount);
  const clearNotifications = useRealtimeNotificationStore((state) => state.clear);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
        setSearchOpen(false);
        setChatMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchOpen(false);
      setChatMenuOpen(false);
      return;
    }

    if (!searchOpen) return;

    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open, searchOpen]);

  if (!user) return null;

  const closeMenu = () => {
    setOpen(false);
    setSearchOpen(false);
    setChatMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();

    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors.
    } finally {
      clearNotifications();
      clearAuth();
      router.push('/login');
    }
  };

  const roleLabel = getUserRoleLabel(user.role);
  const hasActivity = unreadCount > 0 || chatUnreadCount > 0;
  const hasSearchTerm = globalSearch.trim().length > 0;
  const recentChatRooms = chatRooms
    .filter((room) => Boolean(room.lastMessage))
    .slice(0, 5);
  const nextThemeLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
  const navModeLabel =
    navMode === 'manual'
      ? 'Ativar ajuste automatico da barra lateral'
      : 'Ativar ajuste manual da barra lateral';

  return (
    <div className="fac-floating-user-menu" ref={wrapperRef}>
      {open ? (
        <div
          className="fac-floating-user-panel"
          style={{ animation: 'popIn var(--duration-slow) var(--ease-spring) both' }}
        >
          <div className="fac-floating-user-summary">
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenProfile();
              }}
              className="fac-floating-user-profile"
              aria-label="Abrir perfil"
              title="Abrir perfil"
            >
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                size="md"
                className="h-10 w-10 border-primary/15 bg-card/95 text-[10px] shadow-none"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-foreground">
                  {user.name || 'Usuário'}
                </span>
                <span className="mt-0.5 block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {roleLabel}
                </span>
              </span>
            </button>
          </div>

          <div
            className="fac-floating-user-search-shell"
            data-open={searchOpen ? 'true' : 'false'}
          >
            <div className="fac-floating-user-search-shell-inner">
              <label className="fac-floating-user-search">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  placeholder="Buscar no portal"
                />
                {hasSearchTerm ? (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
            </div>
          </div>

          {chatMenuOpen ? (
            <div className="mt-2 w-full rounded-[18px] border border-border/70 bg-background/70 p-2">
              <div className="mb-1 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Conversas recentes
              </div>

              {recentChatRooms.length > 0 ? (
                <div className="space-y-1">
                  {recentChatRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setActiveRoom(room.id);
                        closeMenu();
                        router.push('/chat');
                      }}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-[14px] px-2 py-2 text-left hover:bg-foreground/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-foreground">
                          {getChatRoomTitle(room, currentUserId)}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {getChatMessagePreview(room.lastMessage)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {formatChatTimestamp(room.lastMessage?.createdAt)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    router.push('/chat');
                  }}
                  className="w-full rounded-[14px] px-3 py-3 text-left text-[12px] text-muted-foreground hover:bg-foreground/5"
                >
                  Nenhuma conversa com mensagem. Abrir chat.
                </button>
              )}
            </div>
          ) : null}

          <div className="fac-floating-user-grid">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setChatMenuOpen((prev) => !prev);
              }}
              className="fac-floating-user-action"
              aria-label="Chat"
              title={
                chatUnreadCount > 0
                  ? `${chatUnreadCount} mensagem${chatUnreadCount === 1 ? '' : 'ens'} nao lida${chatUnreadCount === 1 ? '' : 's'}`
                  : 'Chat'
              }
            >
              <MessageSquare className="h-4 w-4" />
              {chatUnreadCount > 0 ? (
                <span className="fac-floating-user-badge">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="fac-floating-user-action"
              data-active={searchOpen || hasSearchTerm ? 'true' : 'false'}
              aria-label="Buscar no portal"
              title="Buscar"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                closeMenu();
                setNotificationsModalOpen(true);
              }}
              className="fac-floating-user-action"
              aria-label="Notificacoes"
              title={
                unreadCount > 0
                  ? `${unreadCount} notificacoes pendentes`
                  : 'Notificacoes'
              }
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="fac-floating-user-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="fac-floating-user-action"
              aria-label={nextThemeLabel}
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleNavMode}
              className="fac-floating-user-action hidden lg:inline-flex"
              data-active={navMode === 'manual' ? 'true' : 'false'}
              aria-label={navModeLabel}
              title={navModeLabel}
            >
              {navMode === 'manual' ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="fac-floating-user-action"
              data-variant="danger"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fac-floating-user-trigger"
        data-open={open ? 'true' : 'false'}
        aria-label="Acoes do usuario"
        aria-expanded={open}
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatarUrl}
          size="md"
          className="h-12 w-12 border-white/50 bg-card/90 text-[12px] shadow-none"
        />
        {hasActivity ? (
          <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
        ) : null}
      </button>

      <UserNotificationsModal
        open={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
      />
    </div>
  );
}
