'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  areAllOptionsSelected,
  backupOptions,
  countSelectedOptions,
  type BackupSelection,
} from '@/lib/backup';

type BackupSelectionPanelProps = {
  title: string;
  subtitle: string;
  selection: BackupSelection;
  setSelection: Dispatch<SetStateAction<BackupSelection>>;
};

export default function BackupSelectionPanel({
  title,
  subtitle,
  selection,
  setSelection,
}: BackupSelectionPanelProps) {
  const selectedCount = countSelectedOptions(selection);
  const allSelected = areAllOptionsSelected(selection);
  const hasSelection = selectedCount > 0;

  const toggleAll = (value: boolean) => {
    setSelection((current) => {
      const next = { ...current };
      backupOptions.forEach((option) => {
        next[option.key] = value;
      });
      return next;
    });
  };

  return (
    <section className="fac-panel animate-in fade-in slide-in-from-bottom-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {selectedCount} selecionados
          </span>
          <button
            type="button"
            className="rounded-lg border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground"
            onClick={() => toggleAll(true)}
            disabled={allSelected}
          >
            Selecionar tudo
          </button>
          <button
            type="button"
            className="rounded-lg border border-border/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground"
            onClick={() => toggleAll(false)}
            disabled={!hasSelection}
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {backupOptions.map((option) => (
          <label
            key={option.key}
            className="flex items-start gap-2 rounded-lg border border-border/70 bg-white/80 px-2.5 py-2 text-foreground"
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border/70"
              checked={selection[option.key]}
              onChange={(event) =>
                setSelection((current) => ({
                  ...current,
                  [option.key]: event.target.checked,
                }))
              }
            />
            <span className="flex flex-col gap-0.5 leading-tight">
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
