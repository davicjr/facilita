'use client';

import { useEffect, useRef, useState } from 'react';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import ChatDrawer from '@/components/chat/chat-drawer';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

const CHAT_LAYOUT_STORAGE_PREFIX = 'facilita:chat-layout';
const DEFAULT_CHAT_HEIGHT = 720;
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_CHAT_HEIGHT = 460;
const MAX_CHAT_HEIGHT = 1040;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 620;
const CHAT_HEIGHT_VIEWPORT_GAP = 40;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type ResizeMode = 'height' | null;

const defaultLayout = {
  chatHeight: DEFAULT_CHAT_HEIGHT,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
};

const getStorageKey = (userId: string) => `${CHAT_LAYOUT_STORAGE_PREFIX}:${userId}`;

function getStoredLayout(userId: string) {
  const raw = window.localStorage.getItem(getStorageKey(userId));
  if (!raw) {
    return defaultLayout;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<{
      chatHeight: number;
      sidebarWidth: number;
    }>;

    return {
      chatHeight:
        typeof parsed.chatHeight === 'number'
          ? clamp(parsed.chatHeight, MIN_CHAT_HEIGHT, MAX_CHAT_HEIGHT)
          : DEFAULT_CHAT_HEIGHT,
      sidebarWidth:
        typeof parsed.sidebarWidth === 'number'
          ? clamp(parsed.sidebarWidth, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH)
          : DEFAULT_SIDEBAR_WIDTH,
    };
  } catch {
    window.localStorage.removeItem(getStorageKey(userId));
    return defaultLayout;
  }
}

export default function ChatPage() {
  const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [maxChatHeight, setMaxChatHeight] = useState(MAX_CHAT_HEIGHT);
  const [mounted, setMounted] = useState(false);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(null);

  const userId = useAuthStore((state) => state.user?.id ?? null);
  const authHydrated = useAuthStore((state) => state.hasHydrated);
  const roomsCount = useChatStore((state) => state.rooms.length);
  const activeStorageKey = userId ? getStorageKey(userId) : null;

  const hasLoadedLayoutRef = useRef(false);
  const loadedStorageKeyRef = useRef<string | null>(null);
  const chatFrameRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    chatHeight,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!mounted || !authHydrated) {
      return;
    }

    if (!userId || !activeStorageKey) {
      const timeoutId = window.setTimeout(() => {
        hasLoadedLayoutRef.current = true;
        loadedStorageKeyRef.current = null;
        setChatHeight(DEFAULT_CHAT_HEIGHT);
        setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    if (loadedStorageKeyRef.current === activeStorageKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const storedLayout = getStoredLayout(userId);
      hasLoadedLayoutRef.current = true;
      loadedStorageKeyRef.current = activeStorageKey;
      setChatHeight(storedLayout.chatHeight);
      setSidebarWidth(storedLayout.sidebarWidth);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeStorageKey, authHydrated, mounted, userId]);

  useEffect(() => {
    if (!mounted || !authHydrated || !userId || !activeStorageKey) {
      return;
    }

    if (!hasLoadedLayoutRef.current || loadedStorageKeyRef.current !== activeStorageKey) {
      return;
    }

    window.localStorage.setItem(
      activeStorageKey,
      JSON.stringify({ chatHeight, sidebarWidth }),
    );
  }, [activeStorageKey, authHydrated, chatHeight, mounted, sidebarWidth, userId]);

  useEffect(() => {
    if (!resizeMode) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const deltaY = event.clientY - resizeStartRef.current.y;

      setChatHeight(
        clamp(
          resizeStartRef.current.chatHeight + deltaY,
          MIN_CHAT_HEIGHT,
          maxChatHeight,
        ),
      );
    };

    const handlePointerUp = () => {
      setResizeMode(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [maxChatHeight, resizeMode]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const updateMaxChatHeight = () => {
      const chatFrame = chatFrameRef.current;
      if (!chatFrame) {
        return;
      }

      const main = chatFrame.closest('main');
      const mainBottom =
        main instanceof HTMLElement
          ? main.getBoundingClientRect().bottom
          : window.innerHeight;
      const top = chatFrame.getBoundingClientRect().top;
      const availableHeight = mainBottom - top - CHAT_HEIGHT_VIEWPORT_GAP;
      const nextMaxHeight = clamp(
        Math.floor(availableHeight),
        MIN_CHAT_HEIGHT,
        MAX_CHAT_HEIGHT,
      );

      setMaxChatHeight(nextMaxHeight);
      setChatHeight((currentHeight) =>
        clamp(currentHeight, MIN_CHAT_HEIGHT, nextMaxHeight),
      );
    };

    const frameId = window.requestAnimationFrame(updateMaxChatHeight);
    window.addEventListener('resize', updateMaxChatHeight);
    window.addEventListener('scroll', updateMaxChatHeight, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateMaxChatHeight())
        : null;

    if (resizeObserver) {
      const chatFrame = chatFrameRef.current;
      const main = chatFrame?.closest('main');
      if (chatFrame) {
        resizeObserver.observe(chatFrame);
      }
      if (main instanceof HTMLElement) {
        resizeObserver.observe(main);
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateMaxChatHeight);
      window.removeEventListener('scroll', updateMaxChatHeight);
      resizeObserver?.disconnect();
    };
  }, [mounted]);

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Conversas" count={roomsCount} />

        <div className="fac-panel-body">
          <div ref={chatFrameRef} className="relative min-w-0">
            {mounted ? (
              <ChatDrawer
                embedded
                embeddedHeight={chatHeight}
                embeddedMaxHeight={maxChatHeight}
                sidebarWidth={sidebarWidth}
                onSidebarWidthChange={setSidebarWidth}
              />
            ) : (
              <ChatDrawer embedded embeddedMaxHeight={maxChatHeight} />
            )}

            <button
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                resizeStartRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  chatHeight,
                };
                setResizeMode('height');
              }}
              className="absolute inset-x-0 bottom-0 hidden h-3 cursor-ns-resize bg-transparent lg:block"
              aria-label="Redimensionar altura do chat"
              title="Arraste para ajustar a altura"
            >
              <span className="absolute bottom-1 left-6 right-6 h-px bg-border/55" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
