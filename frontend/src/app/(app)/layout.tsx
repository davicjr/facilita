import type { ReactNode } from 'react';
import AppShell from '@/components/app-shell';
import WebSocketProvider from '@/components/websocket-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WebSocketProvider>
      <AppShell>{children}</AppShell>
    </WebSocketProvider>
  );
}
