'use client';

import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import {
  areAllOptionsSelected,
  backupOptions,
  buildInitialSelection,
  countSelectedOptions,
  getSelectedEntities,
  type BackupSelection,
} from '@/lib/backup';
import { getApiErrorMessage } from '@/lib/error';
import useNotifyOnChange from '@/hooks/use-notify-on-change';
import { hasAllPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';

const selectedOptionTone = {
  activeCard:
    'border-destructive/40 bg-destructive/5 ring-1 ring-destructive/10 shadow-[0_12px_28px_rgba(185,28,28,0.08)]',
  badge: 'border-destructive/25 bg-destructive/10 text-destructive',
};

export default function ResetPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [selection, setSelection] = useState<BackupSelection>(buildInitialSelection(false));
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useNotifyOnChange(resetError);

  const canUseReset = hasAllPermissions(user, ['canResetSystem']);

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

  const executeReset = async () => {
    if (!hasSelection) {
      setResetError('Selecione pelo menos um item para resetar.');
      return;
    }

    setLoading(true);
    setResetError(null);

    try {
      await api.post('/resets', { entities: selectedEntities });
      setSelection(buildInitialSelection(false));
    } catch (error: unknown) {
      setResetError(getApiErrorMessage(error, 'Erro ao executar reset.'));
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Reset" count={visibleOptions.length} />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {!hasHydrated ? (
            <div className="fac-loading-state">Carregando reset...</div>
          ) : !user ? (
            <div className="fac-error-state">Faca login para acessar o reset.</div>
          ) : !canUseReset ? (
            <div className="fac-error-state">Acesso restrito.</div>
          ) : visibleOptions.length === 0 ? (
            <div className="fac-empty-state">Nenhum item de reset encontrado.</div>
          ) : (
            <div className="grid gap-4">
              <section className="fac-form-card">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="fac-form-title !mb-0">Selecao</p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      Marque apenas as areas que devem ser limpas da instancia atual.
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
                  <p className="fac-form-title !mb-0">Itens do reset</p>
                  <p className="text-[13px] text-muted-foreground">
                    Ative apenas os blocos que devem ser removidos agora.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {visibleOptions.map((option) => {
                    const isActive = selection[option.key];

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`rounded-[16px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 ${
                          isActive
                            ? selectedOptionTone.activeCard
                            : 'border-border bg-white/55 hover:border-destructive/20 hover:bg-white/75 dark:bg-secondary/55 dark:hover:bg-secondary'
                        }`}
                        onClick={() => toggleOption(option.key)}
                        aria-pressed={isActive}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              isActive
                                ? 'border-destructive bg-destructive text-primary-foreground'
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
                      <p className="fac-form-title !mb-0">Acao destrutiva</p>
                      <p className="mt-2 text-[13px] text-muted-foreground">
                        O reset remove imediatamente os dados selecionados da instancia atual.
                      </p>

                      {hasSelection ? (
                        <p className="mt-3 text-[12px] text-muted-foreground">
                          Itens ativos: {selectedPreview.join(', ')}
                          {selectedPreviewOverflow > 0 ? ` +${selectedPreviewOverflow}` : ''}.
                        </p>
                      ) : (
                        <p className="mt-3 text-[12px] text-muted-foreground">
                          Selecione pelo menos um item para habilitar o reset.
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

                  <div className="rounded-[16px] border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-destructive">
                      Antes de executar
                    </p>
                    <p className="mt-2 text-[12px] text-destructive">
                      Ao resetar usuarios ou permissoes, o sistema reprovisiona o superadmin e a
                      matriz base de acessos.
                    </p>
                  </div>

                  {resetError ? (
                    <div className="rounded-[16px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-[12px] text-destructive">
                      {resetError}
                    </div>
                  ) : null}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-destructive px-5 text-[11px] uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
                      onClick={() => setConfirmOpen(true)}
                      disabled={loading || !hasSelection}
                    >
                      {loading ? 'Executando...' : 'Executar reset'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Executar reset"
        description="Essa acao remove os dados das entidades selecionadas. Deseja continuar?"
        confirmLabel="Executar reset"
        loading={loading}
        onConfirm={() => {
          void executeReset();
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
