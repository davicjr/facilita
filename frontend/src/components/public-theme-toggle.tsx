'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/ui-store';

type PublicThemeToggleProps = {
  className?: string;
};

export default function PublicThemeToggle({ className }: PublicThemeToggleProps) {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const resolvedTheme = mounted ? theme : 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className}
      aria-label={resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
    >
      {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
