'use client';

import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { notify } from '@/lib/notify';
import { hasAllPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

const selectedOptionTone = {
  activeCard:
    'border-primary/60 bg-primary/[0.14] ring-1 ring-primary/25 shadow-[0_12px_28px_rgba(15,22,26,0.14)]',
  badge: 'border-primary/25 bg-primary/[0.12] text-foreground',
};

export default function BackupPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [selection, setSelection] = useState(buildInitialSelection);
  const [exporting, setExporting] = useState(false);

  const canUseBackup = hasAllPermissions(user, ['canBackupSystem']);

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

  const handleExport = async () => {
    if (!hasSelection) {
      notify.error('Selecione pelo menos um item para exportar.');
      return;
    }

    setExporting(true);

    try {
      const response = await api.post(
        '/backups/export',
        { entities: selectedEntities },
        { responseType: 'blob', skipNotify: true },
      );
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `facilita-backup-${date}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      notify.success('Backup gerado com sucesso.');
    } catch (error: unknown) {
      notify.error(getApiErrorMessage(error, 'Erro ao gerar backup.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Backup" count={visibleOptions.length} />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {!hasHydrated ? (
            <div className="fac-loading-state">Carregando backup...</div>
          ) : !user ? (
            <div className="fac-error-state">Faca login para acessar o backup.</div>
          ) : !canUseBackup ? (
            <div className="fac-error-state">Acesso restrito.</div>
          ) : visibleOptions.length === 0 ? (
            <div className="fac-empty-state">Nenhum item de backup encontrado.</div>
          ) : (
            <div className="grid gap-4">
              <section className="fac-form-card">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="fac-form-title !mb-0">Selecao</p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      Escolha apenas os blocos que precisam entrar no arquivo de exportacao.
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
                  <p className="fac-form-title !mb-0">Itens do backup</p>
                  <p className="text-[13px] text-muted-foreground">
                    Ative ou remova areas do pacote manualmente.
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="fac-form-title !mb-0">Exportacao</p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      O backup sera gerado em um arquivo ZIP com a selecao atual.
                    </p>

                    {hasSelection ? (
                      <p className="mt-3 text-[12px] text-muted-foreground">
                        Incluidos: {selectedPreview.join(', ')}
                        {selectedPreviewOverflow > 0 ? ` +${selectedPreviewOverflow}` : ''}.
                      </p>
                    ) : (
                      <p className="mt-3 text-[12px] text-muted-foreground">
                        Selecione pelo menos um item para habilitar a exportacao.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        hasSelection
                          ? selectedOptionTone.badge
                          : 'border-border/80 bg-background/55 text-muted-foreground'
                      }`}
                    >
                      {selectedCount} itens
                    </span>

                    <button
                      type="button"
                      className="fac-button-primary text-[11px]"
                      onClick={handleExport}
                      disabled={!hasSelection || exporting}
                    >
                      {exporting ? 'Gerando...' : 'Gerar backup'}
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
