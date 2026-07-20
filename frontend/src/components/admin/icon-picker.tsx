'use client';

import { useState, type CSSProperties } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Paleta curada de ícones para portal intranet
const ICON_NAMES = [
  // Navegação / Layout
  'Home', 'LayoutGrid', 'List', 'Globe', 'Map',
  // Conteúdo
  'FileText', 'File', 'Files', 'Folder', 'FolderOpen',
  'Image', 'Link', 'BookOpen', 'Book', 'Newspaper',
  'Clipboard', 'ClipboardList', 'StickyNote',
  // Comunicação
  'Mail', 'MessageSquare', 'Bell', 'Phone', 'AtSign',
  // Pessoas
  'Users', 'User', 'UserCheck', 'Contact',
  // Negócio
  'Building', 'Building2', 'Briefcase', 'Calendar',
  'Clock', 'CalendarDays', 'BarChart2', 'PieChart',
  // Favoritos / Status
  'Star', 'Heart', 'Bookmark', 'Flag', 'Tag',
  // Sistema
  'Settings', 'Shield', 'Lock', 'Key', 'Database',
  'Server', 'HardDrive', 'Cpu',
  // Ações
  'Download', 'Upload', 'Search', 'Printer', 'Share2',
  // Misc
  'Lightbulb', 'Zap', 'Award', 'Target', 'Layers',
  'Package', 'Box', 'Archive',
] as const;

const lucideIcons = LucideIcons as unknown as Record<string, LucideIcon>;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  disabled?: boolean;
}

function IconButton({
  name,
  selected,
  onClick,
  disabled,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = lucideIcons[name];
  if (!Icon) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={name}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50 ${
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-white/70 text-foreground hover:border-primary/50 hover:bg-muted dark:bg-secondary/50'
      }`}
    >
      <Icon size={16} strokeWidth={1.75} />
    </button>
  );
}

export default function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = ICON_NAMES.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  const hasValue = Boolean(value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar ícone..."
          className="fac-input !h-8 flex-1 !text-[13px]"
          disabled={disabled}
        />
        {hasValue && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
            className="fac-button-secondary !h-8 !px-3 !text-[11px]"
          >
            Remover
          </button>
        )}
      </div>

      <div className="flex max-h-[148px] flex-wrap gap-1 overflow-y-auto rounded-xl border border-border bg-muted/40 p-2 dark:bg-card/40">
        {filtered.length === 0 ? (
          <p className="w-full py-2 text-center text-[12px] text-muted-foreground">
            Nenhum ícone encontrado.
          </p>
        ) : (
          filtered.map((name) => (
            <IconButton
              key={name}
              name={name}
              selected={value === name}
              onClick={() => onChange(value === name ? '' : name)}
              disabled={disabled}
            />
          ))
        )}
      </div>

      {hasValue && (
        <p className="text-[12px] text-muted-foreground">
          Selecionado: <span className="font-medium text-foreground">{value}</span>
        </p>
      )}
    </div>
  );
}

/** Renderiza um ícone Lucide pelo nome. Retorna null se o nome não existir. */
export function LucideIconByName({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
  style,
  }: {
    name: string;
    size?: number;
    strokeWidth?: number;
    className?: string;
    style?: CSSProperties;
  }) {
  const Icon = lucideIcons[name];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}
