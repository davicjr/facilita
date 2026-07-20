'use client';

import { FolderOpen } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';
import { LucideIconByName } from './icon-picker';
import AdminEntityCard from './entity-card';

type AdminCategoryCardProps = {
  category: Pick<
    Category,
    'name' | 'color' | 'icon' | 'adminOnly' | 'status' | '_count' | 'owner'
  >;
  onEdit?: () => void;
  onToggleStatus?: () => void;
  previewAction?: ReactNode;
  size?: 'default' | 'preview';
};

export default function AdminCategoryCard({
  category,
  onEdit,
  onToggleStatus,
  previewAction,
  size = 'default',
}: AdminCategoryCardProps) {
  const isPreview = size === 'preview';
  const contentClassName = cn(isPreview ? 'px-4 py-3' : 'px-3.5 py-3', 'min-h-[96px]');
  const cardClassName = cn(
    isPreview ? 'w-[248px]' : 'w-[300px]',
    category.status === 'INACTIVE' ? 'opacity-80 grayscale' : undefined,
  );

  const total =
    (category._count?.links || 0) +
    (category._count?.schedules || 0) +
    (category._count?.notes || 0);
  const ownerLabel = category.owner?.name?.trim() || (category.adminOnly ? 'Admin' : 'Equipe');
  const accentColor = category.color || '#3b82f6';
  const totalBadgeLabel = total > 99 ? '99+' : String(total);

  const details = (
    <div className="flex min-w-0 items-start gap-3 pr-8">
      <div
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-white/88 shadow-[0_8px_18px_rgba(15,22,26,0.08)]"
        style={{
          borderColor: `color-mix(in srgb, ${accentColor} 26%, transparent)`,
          color: accentColor,
        }}
      >
        {category.icon ? (
          <LucideIconByName
            name={category.icon}
            size={18}
            strokeWidth={2.15}
            className="shrink-0 text-current"
          />
        ) : (
          <FolderOpen size={18} strokeWidth={2.15} className="shrink-0 text-current" />
        )}
      </div>

      <div className="min-w-0">
        <p className="break-words text-[14px] font-semibold leading-snug text-foreground">{category.name}</p>
        <p className="mt-0.5 break-words text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {ownerLabel}
        </p>
      </div>
    </div>
  );

  const badge = (
    <span
      className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold leading-none"
      style={{
        background: `color-mix(in srgb, ${accentColor} 14%, white)`,
        borderColor: `color-mix(in srgb, ${accentColor} 28%, transparent)`,
        color: accentColor,
      }}
      aria-label={`${total} ${total === 1 ? 'item' : 'itens'}`}
      title={`${total} ${total === 1 ? 'item' : 'itens'}`}
    >
      {totalBadgeLabel}
    </span>
  );

  const toggle = onToggleStatus ? (
    <button
      type="button"
      role="switch"
      aria-checked={category.status === 'ACTIVE'}
      aria-label={
        category.status === 'ACTIVE' ? `Desativar ${category.name}` : `Ativar ${category.name}`
      }
      className="fac-toggle shrink-0"
      data-state={category.status === 'ACTIVE' ? 'on' : 'off'}
      onClick={onToggleStatus}
    >
      <span className="fac-toggle-dot" />
    </button>
  ) : null;

  const trailing: ReactNode = previewAction ? (
    previewAction
  ) : (
    <div className="flex w-full items-center justify-end gap-2">{toggle}</div>
  );

  return (
    <AdminEntityCard
      cornerBadge={previewAction ? null : badge}
      details={details}
      trailing={trailing}
      onOpen={onEdit}
      className={cardClassName}
      contentClassName={contentClassName}
      hideCover
    />
  );
}
