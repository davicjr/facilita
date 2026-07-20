'use client';

import { Check } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import {
  areAllOptionsSelected,
  backupOptions,
  buildInitialSelection,
  countSelectedOptions,
  getSelectedEntities,
} from '@/lib/backup';
import { getApiErrorMessage } from '@/lib/error';
import useNotifyOnChange from '@/hooks/use-notify-on-change';
import { hasAllPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

const selectedOptionTone = {
  activeCard:
    'border-primary/60 bg-primary/[0.14] ring-1 ring-primary/25 shadow-[0_12px_28px_rgba(15,22,26,0.14)]',
  badge: 'border-primary/25 bg-primary/[0.12] text-foreground',
};

export default function RestorePage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [selection, setSelection] = useState(buildInitialSelection);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useNotifyOnChange(error);
  useNotifyOnChange(restoreError);

  const canUseRestore = hasAllPermissions(user, ['canBackupSystem']);

  const orderedOptions = useMemo(
    () => [...backupOptions].sort((left, right) => left.label.localeCompare(right.label, 'pt-BR')),
    [],
  );

  const activeSearch = globalSearch.trim();

  const visibleOptions = useMemo(() => {
    const term = activeSearch.toLowerCase();

    return orderedOptions.filter((option) => {
      if (!term) {
        return true;
      }

      return `${option.label} ${option.hint} ${option.key}`.toLowerCase().includes(term);
    });
  }, [activeSearch, orderedOptions]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      setError('Faca login para acessar a restauracao.');
      return;
    }

    if (!canUseRestore) {
      setError('Acesso restrito.');
      return;
    }

    setError(null);
  }, [canUseRestore, hasHydrated, user]);

  const selectedEntities = useMemo(() => getSelectedEntities(selection), [selection]);
  const selectedCount = useMemo(() => countSelectedOptions(selection), [selection]);
  const hasSelection = selectedCount > 0;
  const allSelected = useMemo(() => areAllOptionsSelected(selection), [selection]);

  const selectedLabels = useMemo(
    () =>
      orderedOptions
        .filter((option) => selection[option.key])
        .map((option) => option.label),
    [orderedOptions, selection],
  );
  const selectedPreview = useMemo(() => selectedLabels.slice(0, 3), [selectedLabels]);
  const selectedPreviewOverflow = selectedLabels.length - selectedPreview.length;

  const toggleAll = (value: boolean) => {
    setSelection(buildInitialSelection(value));
  };

  const toggleOption = (key: (typeof backupOptions)[number]['key']) => {
    setSelection((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setRestoreFile(file);
    setRestoreError(null);
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setRestoreError('Selecione um arquivo valido para restaurar.');
      return;
    }

    if (!hasSelection) {
      setRestoreError('Selecione pelo menos um item para restaurar.');
      return;
    }

    setRestoring(true);
    setRestoreError(null);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);
      formData.append('entities', JSON.stringify(selectedEntities));
      formData.append('mode', 'merge');

      await api.post('/backups/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setRestoreFile(null);
    } catch (err: unknown) {
      setRestoreError(getApiErrorMessage(err, 'Erro ao restaurar backup.'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Restauracao" count={visibleOptions.length} />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {!hasHydrated ? (
            <div className="fac-loading-state">Carregando restauracao...</div>
          ) : !user ? (
            <div className="fac-error-state">Faca login para acessar a restauracao.</div>
          ) : !canUseRestore ? (
            <div className="fac-error-state">Acesso restrito.</div>
          ) : visibleOptions.length === 0 ? (
            <div className="fac-empty-state">Nenhum item de restauracao encontrado.</div>
          ) : (
            <div className="grid gap-4">
              <section className="fac-form-card">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="fac-form-title !mb-0">Selecao</p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      Marque apenas as areas que devem ser reprocessadas a partir do arquivo ZIP.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        hasSelection
                          ? selectedOptionTone.badge
                          : 'border-border/80 bg-background/55 text-muted-foreground'
                      }`}
                    >
                      {selectedCount}/{orderedOptions.length} selecionados
                    </span>

                    <button
                      type="button"
                      className="fac-button-secondary text-[11px]"
                      onClick={() => toggleAll(true)}
                      disabled={allSelected}
                    >
                      Selecionar tudo
                    </button>

                    <button
                      type="button"
                      className="fac-button-secondary text-[11px]"
                      onClick={() => toggleAll(false)}
                      disabled={!hasSelection}
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </section>

              <section className="fac-form-card">
                <div className="flex flex-col gap-2 border-b border-border/70 pb-4">
                  <p className="fac-form-title !mb-0">Itens da restauracao</p>
                  <p className="text-[13px] text-muted-foreground">
                    Ative ou remova areas que devem ser lidas do arquivo importado.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {visibleOptions.map((option) => {
                    const isActive = selection[option.key];

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`rounded-[16px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          isActive
                            ? selectedOptionTone.activeCard
                            : 'border-border bg-white/55 hover:border-primary/30 hover:bg-white/75 dark:bg-secondary/55 dark:hover:bg-secondary'
                        }`}
                        onClick={() => toggleOption(option.key)}
                        aria-pressed={isActive}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border/80 bg-background/55 text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>

                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-foreground">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-[12px] text-muted-foreground">
                              {option.hint}
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="fac-form-card">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="fac-form-title !mb-0">Restauracao</p>
                      <p className="mt-2 text-[13px] text-muted-foreground">
                        Envie um arquivo ZIP gerado pelo sistema e aplique a restauracao em modo
                        mesclado.
                      </p>

                      {hasSelection ? (
                        <p className="mt-3 text-[12px] text-muted-foreground">
                          Itens ativos: {selectedPreview.join(', ')}
                          {selectedPreviewOverflow > 0 ? ` +${selectedPreviewOverflow}` : ''}.
                        </p>
                      ) : (
                        <p className="mt-3 text-[12px] text-muted-foreground">
                          Selecione pelo menos um item para habilitar a restauracao.
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        hasSelection
                          ? selectedOptionTone.badge
                          : 'border-border/80 bg-background/55 text-muted-foreground'
                      }`}
                    >
                      {selectedCount} itens
                    </span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="backup-file"
                          className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                        >
                          Arquivo ZIP
                        </label>
                        <input
                          id="backup-file"
                          type="file"
                          accept="application/zip,.zip"
                          className="w-full rounded-xl border border-border bg-white/85 px-3.5 py-2.5 text-[14px] text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/[0.12] file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-foreground"
                          onChange={handleFileChange}
                          disabled={restoring}
                        />
                      </div>

                      <div className="rounded-[16px] border border-border bg-white/45 px-4 py-3 dark:bg-secondary/45">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Arquivo atual
                        </p>
                        <p className="mt-2 text-[13px] text-foreground">
                          {restoreFile ? restoreFile.name : 'Nenhum arquivo selecionado.'}
                        </p>
                      </div>

                      {restoreError ? (
                        <div className="rounded-[16px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[12px] text-destructive">
                          {restoreError}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-destructive px-5 text-[11px] uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
                      onClick={handleRestore}
                      disabled={!restoreFile || !hasSelection || restoring || Boolean(error)}
                    >
                      {restoring ? 'Restaurando...' : 'Restaurar selecao'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
