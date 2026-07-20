'use client';

import { Archive, HardDrive, Settings2, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminField from '@/components/admin/field';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import useNotifyOnChange from '@/hooks/use-notify-on-change';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { hasAllPermissions } from '@/lib/permissions';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { SystemConfig } from '@/types';

type DraftValue = string | number | boolean;

type ConfigCategoryMeta = {
  title: string;
  description: string;
  badge: string;
  scope: string;
  icon: LucideIcon;
};

type ConfigGroup = {
  key: string;
  title: string;
  description: string;
  badge: string;
  scope: string;
  icon: LucideIcon;
  items: SystemConfig[];
  displayCount: number;
  editableCount: number;
  dirtyCount: number;
};

const hiddenConfigKeys = new Set(['initial_superadmin_bootstrapped', 'shortcut_catalog']);
const hiddenConfigCategories = new Set(['system']);

const categoryMeta: Record<string, ConfigCategoryMeta> = {
  backup: {
    title: 'Backup',
    description: 'Agendamento automatico, retencao e exportacao completa da base.',
    badge: 'Rotina critica',
    scope: 'Protecao e recuperacao',
    icon: Archive,
  },
  storage: {
    title: 'Armazenamento',
    description: 'Diretorios padrao usados para uploads e arquivos exportados.',
    badge: 'Infra local',
    scope: 'Arquivos da instancia',
    icon: HardDrive,
  },
  system: {
    title: 'Sistema',
    description: 'Metadados da instalacao e informacoes estruturais da aplicacao.',
    badge: 'Somente leitura',
    scope: 'Estado da instancia',
    icon: Settings2,
  },
  other: {
    title: 'Outras configuracoes',
    description: 'Ajustes adicionais que nao se encaixam nas categorias principais.',
    badge: 'Geral',
    scope: 'Configuracao complementar',
    icon: Settings2,
  },
};

const configLabels: Record<string, string> = {
  backup_directory: 'Diretorio de backup',
  backup_schedule_enabled: 'Backup automatico',
  backup_schedule_time: 'Horario do backup',
  backup_retention_days: 'Retencao (dias)',
  upload_directory: 'Diretorio de uploads',
  export_directory: 'Diretorio de exportacao',
  install_date: 'Data de instalacao',
  app_version: 'Versao do sistema',
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const selectedGroupTone = {
  activeButton:
    'border-primary/60 bg-primary/[0.14] ring-1 ring-primary/25 shadow-[0_12px_28px_rgba(15,22,26,0.14)]',
  rail: 'bg-primary',
  countBadge: 'border-primary/25 bg-primary/[0.12] text-foreground',
  currentBadge:
    'border-primary/60 bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.14)]',
};

const parseValue = (config: SystemConfig): DraftValue => {
  switch (config.type) {
    case 'boolean':
      return config.value === 'true';
    case 'number': {
      const parsed = Number(config.value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    default:
      return config.value ?? '';
  }
};

const formatValue = (config: SystemConfig, value: DraftValue) => {
  switch (config.type) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (value === '') {
        return '';
      }
      return Number.isFinite(Number(value)) ? String(Math.floor(Number(value))) : '';
    default:
      return String(value ?? '');
  }
};

const serializeValue = (config: SystemConfig, value: DraftValue) => {
  switch (config.type) {
    case 'boolean':
      return Boolean(value);
    case 'number':
      return Number(value);
    default:
      return String(value ?? '');
  }
};

const isValidValue = (config: SystemConfig, value: DraftValue) => {
  if (config.type === 'number') {
    if (value === '') {
      return false;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  if (config.type === 'time') {
    return timePattern.test(String(value ?? '').trim());
  }

  if (config.type === 'path' || config.type === 'string') {
    return String(value ?? '').trim().length > 0;
  }

  return true;
};

const getConfigTypeLabel = (type: string) => {
  switch (type) {
    case 'boolean':
      return 'Alternancia';
    case 'number':
      return 'Numero';
    case 'path':
      return 'Caminho';
    case 'time':
      return 'Horario';
    default:
      return 'Texto';
  }
};

const getInputHint = (config: SystemConfig) => {
  switch (config.type) {
    case 'path':
      return 'Use caminho relativo ou absoluto.';
    case 'time':
      return 'Use o formato HH:MM.';
    case 'number':
      return 'Informe um numero inteiro maior ou igual a zero.';
    default:
      return undefined;
  }
};

const getDisplayValue = (config: SystemConfig) => {
  if (config.type === 'boolean') {
    return config.value === 'true' ? 'Ativo' : 'Inativo';
  }

  return config.value || '-';
};

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [selectedGroupKey, setSelectedGroupKey] = useState('backup');

  useNotifyOnChange(error);

  const canManageSettings = hasAllPermissions(user, ['canManageSystemConfig']);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<SystemConfig[]>('/system-config');
      const data = Array.isArray(response.data)
        ? response.data.filter((config) => !hiddenConfigKeys.has(config.key))
        : [];

      setConfigs(data);
      setDrafts(
        data.reduce<Record<string, DraftValue>>((acc, config) => {
          acc[config.key] = parseValue(config);
          return acc;
        }, {}),
      );
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nao foi possivel carregar configuracoes.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user) {
      setError('Faca login para acessar as configuracoes.');
      setLoading(false);
      return;
    }

    if (!canManageSettings) {
      setError('Acesso restrito.');
      setLoading(false);
      return;
    }

    void loadConfigs();
  }, [canManageSettings, hasHydrated, loadConfigs, user]);

  const groupedConfigs = useMemo(() => {
    const groups = new Map<string, SystemConfig[]>();

    configs.forEach((config) => {
      const category = config.category?.trim() || 'other';
      if (hiddenConfigCategories.has(category)) {
        return;
      }
      const current = groups.get(category) ?? [];
      current.push(config);
      groups.set(category, current);
    });

    return Array.from(groups.keys())
      .map((key) => {
        const meta = categoryMeta[key] ?? categoryMeta.other;
        return {
          key,
          ...meta,
          items: (groups.get(key) ?? []).sort((left, right) => left.key.localeCompare(right.key)),
          displayCount: 0,
          editableCount: 0,
          dirtyCount: 0,
        };
      })
      .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'));
  }, [configs]);

  const activeSearch = globalSearch.trim();

  const visibleGroups = useMemo(() => {
    const term = activeSearch.toLowerCase();
    return groupedConfigs.reduce<ConfigGroup[]>((acc, group) => {
      const groupMatches =
        !term ||
        `${group.title} ${group.description} ${group.scope} ${group.badge}`
          .toLowerCase()
          .includes(term);

      const items = group.items.filter((config) => {
        if (groupMatches) {
          return true;
        }

        const label = configLabels[config.key] || config.key;
        return `${label} ${config.description ?? ''} ${config.key}`
          .toLowerCase()
          .includes(term);
      });

      if (items.length > 0) {
        acc.push({
          ...group,
          items,
          displayCount: items.length,
          editableCount: items.filter((config) => config.isEditable).length,
          dirtyCount: items.reduce((total, config) => {
            const draft = drafts[config.key] ?? parseValue(config);
            return total + (formatValue(config, draft) !== config.value ? 1 : 0);
          }, 0),
        });
      }

      return acc;
    }, []);
  }, [activeSearch, drafts, groupedConfigs]);

  const selectedGroup = useMemo(
    () =>
      visibleGroups.find((group) => group.key === selectedGroupKey) ??
      visibleGroups[0] ??
      null,
    [selectedGroupKey, visibleGroups],
  );

  useEffect(() => {
    if (visibleGroups.length === 0) {
      return;
    }

    const hasSelectedGroup = visibleGroups.some((group) => group.key === selectedGroupKey);
    if (!hasSelectedGroup) {
      setSelectedGroupKey(visibleGroups[0].key);
    }
  }, [selectedGroupKey, visibleGroups]);

  const handleDraftChange = (key: string, value: DraftValue) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (config: SystemConfig) => {
    const value = drafts[config.key];

    if (!isValidValue(config, value)) {
      notify.error('Valor invalido para esta configuracao.');
      return;
    }

    setSaving((current) => ({ ...current, [config.key]: true }));

    try {
      const response = await api.patch<SystemConfig>(`/system-config/${config.key}`, {
        value: serializeValue(config, value),
      });
      const updated = response.data;

      setConfigs((current) =>
        current.map((item) => (item.key === updated.key ? updated : item)),
      );
      setDrafts((current) => ({
        ...current,
        [updated.key]: parseValue(updated),
      }));
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, 'Erro ao salvar configuracao.'));
    } finally {
      setSaving((current) => ({ ...current, [config.key]: false }));
    }
  };

  const renderConfigCard = (config: SystemConfig) => {
    const value = drafts[config.key] ?? parseValue(config);
    const formattedValue = formatValue(config, value);
    const dirty = formattedValue !== config.value;
    const valid = isValidValue(config, value);
    const isSaving = Boolean(saving[config.key]);
    const label = configLabels[config.key] || config.key;
    const inputId = `system-config-${config.key}`;

    return (
      <section
        key={config.key}
        className="rounded-[18px] border border-border bg-white/55 p-4 dark:bg-secondary/55"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-border/80 bg-background/55 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {getConfigTypeLabel(config.type)}
                </span>

                {!config.isEditable ? (
                  <span className="inline-flex rounded-full border border-border/80 bg-background/55 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Somente leitura
                  </span>
                ) : null}

                {dirty && config.isEditable ? (
                  <span className="inline-flex rounded-full border border-amber-600/30 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Alteracoes pendentes
                  </span>
                ) : null}

                {!valid && dirty && config.isEditable ? (
                  <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
                    Valor invalido
                  </span>
                ) : null}
              </div>

              <div>
                <h3 className="text-[16px] font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {config.description || config.key}
                </p>
              </div>
            </div>

            <div className="rounded-[14px] border border-border/80 bg-background/55 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Chave
              </p>
              <p className="mt-1 text-[11px] font-medium text-foreground">{config.key}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              {config.isEditable ? (
                <AdminField label="Valor" htmlFor={inputId} hint={getInputHint(config)}>
                  {config.type === 'boolean' ? (
                    <div className="rounded-[16px] border border-border/70 bg-card/80 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">
                            {Boolean(value) ? 'Ativado' : 'Desativado'}
                          </p>
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {Boolean(value)
                              ? 'A configuracao esta habilitada.'
                              : 'A configuracao esta desligada.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={`fac-toggle shrink-0 ${
                            isSaving ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                          data-state={Boolean(value) ? 'on' : 'off'}
                          onClick={() => handleDraftChange(config.key, !Boolean(value))}
                          disabled={isSaving}
                          aria-pressed={Boolean(value)}
                          aria-label={`${Boolean(value) ? 'Desativar' : 'Ativar'} ${label}`}
                        >
                          <span className="fac-toggle-dot" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <input
                      id={inputId}
                      type={
                        config.type === 'number'
                          ? 'number'
                          : config.type === 'time'
                            ? 'time'
                            : 'text'
                      }
                      min={config.type === 'number' ? 0 : undefined}
                      step={config.type === 'number' ? 1 : undefined}
                      value={String(value ?? '')}
                      onChange={(event) => {
                        const nextValue =
                          config.type === 'number'
                            ? event.target.value === ''
                              ? ''
                              : Number(event.target.value)
                            : event.target.value;
                        handleDraftChange(config.key, nextValue);
                      }}
                      className={`fac-input ${
                        !valid && dirty ? 'border-rose-500/40 ring-1 ring-rose-500/20' : ''
                      }`}
                      disabled={isSaving}
                    />
                  )}
                </AdminField>
              ) : (
                <div className="rounded-[16px] border border-border/70 bg-card/80 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Valor atual
                  </p>
                  <p className="mt-2 text-[13px] font-semibold text-foreground">
                    {getDisplayValue(config)}
                  </p>
                </div>
              )}
            </div>

            {config.isEditable ? (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="fac-button-primary text-[11px]"
                  onClick={() => handleSave(config)}
                  disabled={!dirty || !valid || isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar ajuste'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Configuracoes" count={visibleGroups.length} />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {loading ? (
            <div className="fac-loading-state">Carregando configuracoes...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : visibleGroups.length === 0 ? (
            <div className="fac-empty-state">Nenhuma configuracao encontrada.</div>
          ) : (
            <div className="grid gap-4">
              <section className="fac-form-card">
                <div className="grid gap-3 md:grid-cols-3">
                  {visibleGroups.map((group) => {
                    const Icon = group.icon;
                    const isActive = selectedGroup?.key === group.key;

                    return (
                      <button
                        key={`selector-${group.key}`}
                        type="button"
                        className={`relative overflow-hidden flex items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          isActive
                            ? selectedGroupTone.activeButton
                            : 'border-border bg-white/55 hover:border-primary/30 hover:bg-white/75 dark:bg-secondary/55 dark:hover:bg-secondary'
                        }`}
                        onClick={() => setSelectedGroupKey(group.key)}
                        aria-pressed={isActive}
                      >
                        {isActive ? (
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-2 left-2 w-1 rounded-full ${selectedGroupTone.rail}`}
                          />
                        ) : null}

                        <span className="min-w-0 flex flex-1 items-center gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                              isActive
                                ? 'border-primary/20 bg-primary/[0.12] text-foreground'
                                : 'border-border/80 bg-background/55 text-muted-foreground'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          <span className="min-w-0">
                            <span className="block text-[16px] font-display leading-none text-foreground">
                              {group.title}
                            </span>
                            <span
                              className={`mt-1 block text-[11px] ${
                                isActive ? 'text-foreground/80' : 'text-muted-foreground'
                              }`}
                            >
                              {group.scope}
                            </span>
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              isActive
                                ? selectedGroupTone.countBadge
                                : 'border-border/80 bg-background/55 text-muted-foreground'
                            }`}
                          >
                            {group.displayCount} itens
                          </span>

                          {group.dirtyCount > 0 ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-600/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              {group.dirtyCount}
                            </span>
                          ) : null}

                          {isActive ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${selectedGroupTone.currentBadge}`}
                            >
                              Atual
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-[13px] text-muted-foreground">
                  Revise uma categoria por vez, valide o impacto operacional e salve apenas o que
                  foi alterado. Backups automáticos e atalhos de teclado agora têm páginas
                  próprias, acessíveis pela navegação lateral.
                </p>
              </section>

              {selectedGroup ? (
                <section className="fac-form-card">
                  <div className="flex flex-col gap-4 border-b border-border/70 pb-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground">
                          {selectedGroup.badge}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                            selectedGroup.dirtyCount > 0
                              ? 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-border/80 bg-background/55 text-muted-foreground'
                          }`}
                        >
                          {selectedGroup.dirtyCount > 0 ? 'Alterado' : 'Sincronizado'}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.08] text-foreground">
                          <selectedGroup.icon className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <h2 className="text-[24px] font-display leading-none text-foreground">
                            {selectedGroup.title}
                          </h2>
                          <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
                            {selectedGroup.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[380px]">
                      {[
                        {
                          label: 'Itens',
                          value: String(selectedGroup.displayCount),
                          hint: 'Configuracoes visiveis nesta categoria.',
                        },
                        {
                          label: 'Editaveis',
                          value: String(selectedGroup.editableCount),
                          hint:
                            selectedGroup.editableCount > 0
                              ? 'Podem ser atualizadas por aqui.'
                              : 'Apenas informacoes de leitura.',
                        },
                        {
                          label: 'Pendencias',
                          value: String(selectedGroup.dirtyCount),
                          hint:
                            selectedGroup.dirtyCount > 0
                              ? 'Ha alteracoes locais ainda nao salvas.'
                              : 'Nenhuma alteracao pendente.',
                        },
                      ].map((item) => (
                        <div
                          key={`${selectedGroup.key}-${item.label}`}
                          className="rounded-[16px] border border-border bg-white/55 px-3 py-3 dark:bg-secondary/55"
                        >
                          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-2 text-[14px] font-semibold text-foreground">
                            {item.value}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">{item.hint}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedGroup.key === 'backup' ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-[18px] border border-border bg-white/45 p-4 dark:bg-secondary/45 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                          Backups automáticos
                        </p>
                        <p className="mt-2 text-[13px] text-muted-foreground">
                          Consulte os arquivos gerados pelo agendamento ou gere um pacote completo
                          sob demanda em uma página própria.
                        </p>
                      </div>

                      <a href="/admin/settings/backups-automaticos" className="fac-button-primary text-[11px]">
                        Ver backups automáticos
                      </a>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {selectedGroup.items.map((config) => renderConfigCard(config))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
