'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { Link } from '@/types';

interface SortableLinkItemProps {
  link: Link;
}

function SortableLinkItem({ link }: SortableLinkItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-border bg-white/85 px-4 py-3 dark:bg-card/85"
    >
      {/* Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </button>

      {/* Color dot */}
      {link.color && (
        <div
          className="h-3 w-3 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: link.color }}
        />
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">{link.title}</p>
        {link.category && (
          <p className="text-[12px] text-muted-foreground">{link.category.name}</p>
        )}
      </div>

      {/* Status */}
      <span
        className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] uppercase tracking-wider ${
          link.status === 'ACTIVE'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {link.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  );
}

interface SortableLinkListProps {
  links: Link[];
  onSave: (orderedIds: string[]) => Promise<void>;
  onCancel: () => void;
}

export default function SortableLinkList({ links, onSave, onCancel }: SortableLinkListProps) {
  const [items, setItems] = useState<Link[]>(links);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map((item) => item.id));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
        <p className="text-[13px] text-foreground">
          Arraste os links para definir a ordem de exibição.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="fac-button-ghost !h-8 !px-3 !text-[11px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="fac-button-primary !h-8 !px-3 !text-[11px]"
          >
            {saving ? 'Salvando...' : 'Salvar ordem'}
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((link) => (
              <SortableLinkItem key={link.id} link={link} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
