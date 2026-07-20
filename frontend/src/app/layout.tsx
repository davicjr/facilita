import type { Metadata } from 'next';
import NotificationStack from '@/components/notification-stack';
import ThemeSync from '@/components/theme-sync';
import { FavoritesProvider } from '@/hooks/useFavorites';
import './globals.css';

export const metadata: Metadata = {
  title: 'Facilita',
  description: 'Portal administrativo do Facilita.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ThemeSync />
        <FavoritesProvider>{children}</FavoritesProvider>
        <NotificationStack />
      </body>
    </html>
  );
}
