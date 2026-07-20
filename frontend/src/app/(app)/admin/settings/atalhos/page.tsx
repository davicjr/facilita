'use client';

import {
  ExternalLink,
  FileText,
  Folder,
  Globe,
  Home,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Share2,
  Star,
  StickyNote,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminField from '@/components/admin/field';
import AdminModal from '@/components/admin/modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import { getApiErrorMessage } from '@/lib/error';
import { hasAllPermissions } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  BUILTIN_SHORTCUTS,
  buildShortcutCombo,
  formatShortcutInput,
  getKeyboardEventShortcutKeys,
  isActionShortcutTarget,
  isInternalShortcutTarget,
  isShortcutTargetValid,
  mapCustomShortcutToDisplay,
  parseShortcutInput,
  SHORTCUT_ACTIONS,
  type ShortcutDisplayItem,
} from '@/lib/shortcuts';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { CustomShortcut } from '@/types';

type ShortcutFormState = {
  title: string;
  description: string;
  context: string;
  keysInput: string;
  target: string;
  openInNewTab: boolean;
};

type ShortcutFormErrors = {
  title?: string;
  keysInput?: string;
  target?: string;
};

const emptyShortcutForm: ShortcutFormState = {
  title: '',
  description: '',
  context: 'Funciona fora de campos de digitacao.',
  keysInput: '',
  target: '',
  openInNewTab: false,
};

type ShortcutRouteOption = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type ShortcutRouteGroup = {
  label: string;
  options: ShortcutRouteOption[];
};

const SHORTCUT_ROUTE_GROUPS: ShortcutRouteGroup[] = [
  {
    label: 'Navegação',
    options: [
      { href: '/', label: 'Início', icon: Home },
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/favoritos', label: 'Favoritos', icon: Star },
      { href: '/compartilhados', label: 'Compartilhados', icon: Share2 },
    ],
  },
  {
    label: 'Portal',
    options: [
      { href: '/admin/links', label: 'Links', icon: Link2 },
      { href: '/admin/schedules', label: 'Documentos', icon: FileText },
      { href: '/admin/notes', label: 'Notas', icon: StickyNote },
      { href: '/admin/categories', label: 'Categorias', icon: Folder },
      { href: '/admin/images', label: 'Galeria', icon: ImageIcon },
    ],
  },
  {
    label: 'Administração',
    options: [
      { href: '/admin/users', label: 'Usuários', icon: Users },
      { href: '/admin/settings', label: 'Configurações', icon: Settings2 },
      { href: '/admin/settings/atalhos', label: 'Atalhos', icon: Settings2 },
      { href: '/admin/settings/backups-automaticos', label: 'Backups automáticos', icon: Settings2 },
      { href: '/admin/backup', label: 'Backup', icon: Settings2 },
    ],
  },
];

const ACTION_ICONS: Record<string, LucideIcon> = {
  'action:open_search': Search,
  'action:toggle_theme': Moon,
  'action:toggle_nav': PanelLeftClose,
  'action:toggle_nav_mode': PanelLeftOpen,
  'action:logout': LogOut,
};

export default function ShortcutsPage() {
  const user = useAuthStore((state) => state.user);
  const shortcutCatalog = useUiStore((state) => state.shortcutCatalog);
  const setShortcutCatalog = useUiStore((state) => state.setShortcutCatalog);

  const canManageSettings = hasAllPermissions(user, ['canManageSystemConfig']);

  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [shortcutForm, setShortcutForm] = useState<ShortcutFormState>(emptyShortcutForm);
  const [shortcutFormErrors, setShortcutFormErrors] = useState<ShortcutFormErrors>({});
  const [shortcutEditingId, setShortcutEditingId] = useState<string | null>(null);
  const [shortcutSaving, setShortcutSaving] = useState(false);
  const [isCapturingKeys, setIsCapturingKeys] = useState(false);
  const [shortcutTargetMode, setShortcutTargetMode] = useState<'route' | 'action' | 'external'>('route');
  const [shortcutDeleteTarget, setShortcutDeleteTarget] = useState<CustomShortcut | null>(null);
  const [shortcutRemoving, setShortcutRemoving] = useState(false);

  const shortcutItems = useMemo(
    () => [...BUILTIN_SHORTCUTS, ...shortcutCatalog.map((shortcut) => mapCustomShortcutToDisplay(shortcut))],
    [shortcutCatalog],
  );

  const createShortcutId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `shortcut-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  };

  const closeShortcutModal = () => {
    setShortcutModalOpen(false);
    setShortcutEditingId(null);
    setShortcutForm({ ...emptyShortcutForm });
    setShortcutFormErrors({});
    setShortcutTargetMode('route');
  };

  const openCreateShortcut = () => {
    setShortcutEditingId(null);
    setShortcutForm({ ...emptyShortcutForm });
    setShortcutFormErrors({});
    setShortcutTargetMode('route');
    setShortcutModalOpen(true);
  };

  const openEditShortcut = (shortcut: CustomShortcut) => {
    setShortcutEditingId(shortcut.id);
    setShortcutForm({
      title: shortcut.title,
      description: shortcut.description,
      context: shortcut.context,
      keysInput: formatShortcutInput(shortcut.keys),
      target: shortcut.target,
      openInNewTab: shortcut.openInNewTab,
    });
    setShortcutFormErrors({});
    setShortcutTargetMode(
      isActionShortcutTarget(shortcut.target) ? 'action'
      : shortcut.target.startsWith('/') ? 'route'
      : 'external'
    );
    setShortcutModalOpen(true);
  };

  const buildShortcutFromForm = () => {
    const nextErrors: ShortcutFormErrors = {};
    const title = shortcutForm.title.trim();
    const keys = parseShortcutInput(shortcutForm.keysInput);
    const target = shortcutForm.target.trim();

    if (!title) {
      nextErrors.title = 'Titulo obrigatorio.';
    }

    if (!keys) {
      nextErrors.keysInput = 'Use um formato como Ctrl + Shift + K.';
    }

    if (!isShortcutTargetValid(target)) {
      nextErrors.target = 'Use uma rota iniciando com / ou uma URL http(s).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setShortcutFormErrors(nextErrors);
      return null;
    }

    if (!keys) {
      return null;
    }

    const combo = buildShortcutCombo(keys);
    const conflictingShortcut = shortcutItems.find(
      (shortcut) =>
        buildShortcutCombo(shortcut.keys) === combo &&
        (shortcut.source === 'system' || shortcut.id !== shortcutEditingId),
    );

    if (conflictingShortcut) {
      setShortcutFormErrors({
        keysInput:
          conflictingShortcut.source === 'system'
            ? 'Essa combinacao ja e reservada pelo sistema.'
            : 'Essa combinacao ja esta cadastrada.',
      });
      return null;
    }

    return {
      id: shortcutEditingId ?? createShortcutId(),
      title,
      description:
        shortcutForm.description.trim() || `Abre ${isInternalShortcutTarget(target) ? 'uma rota interna' : 'um destino externo'}.`,
      context: shortcutForm.context.trim() || 'Funciona fora de campos de digitacao.',
      keys,
      target,
      openInNewTab: shortcutForm.openInNewTab,
    } satisfies CustomShortcut;
  };

  const persistShortcutCatalog = async (
    nextCatalog: CustomShortcut[],
    successMessage: string,
    fallbackMessage: string,
  ) => {
    try {
      const response = await api.patch<CustomShortcut[]>(
        '/system-config/shortcuts/catalog',
        { items: nextCatalog },
        { skipNotify: true },
      );
      const savedCatalog = Array.isArray(response.data) ? response.data : [];
      setShortcutCatalog(savedCatalog);
      notify.success(successMessage);
      return true;
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, fallbackMessage));
      return false;
    }
  };

  const handleSaveShortcut = async () => {
    const shortcut = buildShortcutFromForm();

    if (!shortcut) {
      return;
    }

    const nextCatalog = shortcutEditingId
      ? shortcutCatalog.map((item) => (item.id === shortcutEditingId ? shortcut : item))
      : [...shortcutCatalog, shortcut];

    setShortcutSaving(true);

    const saved = await persistShortcutCatalog(
      nextCatalog,
      shortcutEditingId ? 'Atalho atualizado com sucesso.' : 'Atalho criado com sucesso.',
      'Erro ao salvar atalho.',
    );

    if (saved) {
      closeShortcutModal();
    }

    setShortcutSaving(false);
  };

  const handleRemoveShortcut = async () => {
    if (!shortcutDeleteTarget) {
      return;
    }

    setShortcutRemoving(true);

    const saved = await persistShortcutCatalog(
      shortcutCatalog.filter((shortcut) => shortcut.id !== shortcutDeleteTarget.id),
      'Atalho removido com sucesso.',
      'Erro ao remover atalho.',
    );

    if (saved) {
      setShortcutDeleteTarget(null);
    }

    setShortcutRemoving(false);
  };

  const renderShortcutCard = (shortcut: ShortcutDisplayItem) => {
    const isCustom = shortcut.source === 'custom';

    const openThisForEdit = () => {
      if (!isCustom) return;
      const editableShortcut = shortcutCatalog.find((item) => item.id === shortcut.id);
      if (editableShortcut) {
        openEditShortcut(editableShortcut);
      }
    };

    return (
    <section
      key={shortcut.id}
      role={isCustom ? 'button' : undefined}
      tabIndex={isCustom ? 0 : undefined}
      onClick={isCustom ? openThisForEdit : undefined}
      onKeyDown={
        isCustom
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openThisForEdit();
              }
            }
          : undefined
      }
      aria-label={isCustom ? `Editar atalho ${shortcut.title}` : undefined}
      className={cn(
        'relative rounded-[18px] border border-border bg-white/55 p-4 dark:bg-secondary/55',
        isCustom
          ? 'cursor-pointer transition hover:border-primary/35 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
          : undefined,
      )}
    >
      {isCustom ? (
        <button
          type="button"
          aria-label={`Remover atalho ${shortcut.title}`}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-destructive/30 bg-white/92 text-destructive shadow-[0_4px_10px_rgba(15,22,26,0.1)] transition hover:bg-destructive/10 dark:bg-secondary/92"
          onClick={(event) => {
            event.stopPropagation();
            const removableShortcut = shortcutCatalog.find((item) => item.id === shortcut.id);
            if (removableShortcut) {
              setShortcutDeleteTarget(removableShortcut);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-border/80 bg-background/55 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {shortcut.source === 'system' ? 'Atalho global' : 'Atalho personalizado'}
              </span>

              {shortcut.source === 'custom' ? (
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground">
                  {shortcut.openInNewTab ? 'Nova aba' : 'Mesma aba'}
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-[16px] font-semibold text-foreground">{shortcut.title}</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">{shortcut.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shortcut.keys.map((key, index) => (
              <div key={`${shortcut.id}-${key}`} className="flex items-center gap-2">
                <span className="inline-flex min-w-[38px] items-center justify-center rounded-[12px] border border-border/80 bg-background/75 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-[0_4px_10px_rgba(15,22,26,0.08)]">
                  {key}
                </span>
                {index < shortcut.keys.length - 1 ? (
                  <span className="text-[12px] font-semibold text-muted-foreground">+</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[16px] border border-border/70 bg-card/80 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Quando usar
            </p>
            <p className="mt-2 text-[13px] text-foreground">{shortcut.context}</p>
          </div>

          <div className="rounded-[16px] border border-border/70 bg-card/80 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Acao
            </p>
            <p className="mt-2 text-[13px] text-foreground">
              {shortcut.actionKind === 'GLOBAL_SEARCH'
                ? 'Abre a busca global.'
                : shortcut.target}
            </p>
            {shortcut.actionKind === 'TARGET' ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {isInternalShortcutTarget(shortcut.target ?? '')
                  ? 'Navega para uma rota interna.'
                  : 'Abre um destino externo.'}
              </p>
            ) : null}
          </div>
        </div>

      </div>
    </section>
    );
  };

  const parsedKeys = parseShortcutInput(shortcutForm.keysInput);

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Atalhos"
          count={shortcutItems.length}
          actions={
            canManageSettings ? (
              <button
                type="button"
                className="fac-button-primary text-[11px]"
                onClick={openCreateShortcut}
              >
                Novo atalho
              </button>
            ) : undefined
          }
        />

        <div className="fac-panel-body space-y-4">
          {!canManageSettings ? (
            <div className="fac-error-state">Acesso restrito.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {shortcutItems.map((shortcut) => renderShortcutCard(shortcut))}
            </div>
          )}
        </div>
      </section>

      <AdminModal
        open={shortcutModalOpen}
        title={shortcutEditingId ? 'Editar atalho' : 'Novo atalho'}
        description={shortcutEditingId ? 'Altere os campos que desejar e salve.' : 'Defina um nome, as teclas e para onde o atalho leva.'}
        onClose={shortcutSaving ? () => undefined : closeShortcutModal}
        panelClassName="max-w-lg"
        footer={
          <>
            <button
              type="button"
              className="fac-button-secondary text-[11px]"
              onClick={closeShortcutModal}
              disabled={shortcutSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="fac-button-primary text-[11px]"
              onClick={handleSaveShortcut}
              disabled={shortcutSaving}
            >
              {shortcutSaving ? 'Salvando...' : shortcutEditingId ? 'Salvar' : 'Criar atalho'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <AdminField label="Nome do atalho" htmlFor="shortcut-title">
            <div className="space-y-1.5">
              <input
                id="shortcut-title"
                type="text"
                value={shortcutForm.title}
                onChange={(event) =>
                  setShortcutForm((current) => ({ ...current, title: event.target.value }))
                }
                className={`fac-input ${shortcutFormErrors.title ? 'border-rose-500/40 ring-1 ring-rose-500/20' : ''}`}
                disabled={shortcutSaving}
                placeholder="Ex.: Abrir links, Ir para o início"
                autoFocus
              />
              {shortcutFormErrors.title ? (
                <p className="text-[12px] text-rose-600">{shortcutFormErrors.title}</p>
              ) : null}
            </div>
          </AdminField>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Combinação de teclas
            </p>

            <div
              role="button"
              tabIndex={shortcutSaving ? -1 : 0}
              aria-label="Campo de captura de teclas"
              className={[
                'relative flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-[10px] border px-4 py-3 transition select-none outline-none',
                isCapturingKeys
                  ? 'border-primary/50 bg-primary/[0.04] ring-2 ring-primary/20'
                  : shortcutFormErrors.keysInput
                    ? 'border-rose-500/40 bg-card/80 ring-1 ring-rose-500/20'
                    : 'border-border/70 bg-card/80 hover:border-border',
              ].join(' ')}
              onFocus={() => setIsCapturingKeys(true)}
              onBlur={() => setIsCapturingKeys(false)}
              onKeyDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const keys = getKeyboardEventShortcutKeys(event.nativeEvent);
                if (keys) {
                  setShortcutForm((current) => ({ ...current, keysInput: formatShortcutInput(keys) }));
                  setShortcutFormErrors((current) => ({ ...current, keysInput: undefined }));
                }
              }}
            >
              {parsedKeys ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {parsedKeys.map((key) => (
                    <kbd
                      key={key}
                      className="inline-flex items-center rounded-[7px] border border-border bg-background px-2.5 py-1 font-mono text-[12px] font-semibold text-foreground shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              ) : (
                <span className={`text-[13px] ${isCapturingKeys ? 'animate-pulse text-primary' : 'text-muted-foreground/60'}`}>
                  {isCapturingKeys ? 'Pressione as teclas agora...' : 'Clique aqui e pressione as teclas'}
                </span>
              )}

              {parsedKeys ? (
                <button
                  type="button"
                  tabIndex={-1}
                  className="shrink-0 rounded-md p-1 text-muted-foreground/50 hover:bg-muted hover:text-foreground transition"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShortcutForm((current) => ({ ...current, keysInput: '' }));
                  }}
                  aria-label="Limpar combinação"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {shortcutFormErrors.keysInput ? (
              <p className="text-[12px] text-rose-600">{shortcutFormErrors.keysInput}</p>
            ) : isCapturingKeys ? (
              <p className="text-[12px] text-primary/70">
                Use pelo menos um modificador (Ctrl, Alt, Shift) + uma tecla.
              </p>
            ) : parsedKeys ? null : (
              <p className="text-[12px] text-muted-foreground">
                Ex.: Ctrl + Shift + K, Alt + L
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Destino
            </p>

            <div className={`space-y-3 rounded-[12px] border p-4 ${shortcutFormErrors.target ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-border/60 bg-card/50'}`}>
              {SHORTCUT_ROUTE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const Icon = option.icon;
                      const isSelected = shortcutTargetMode === 'route' && shortcutForm.target === option.href;
                      return (
                        <button
                          key={option.href}
                          type="button"
                          disabled={shortcutSaving}
                          onClick={() => {
                            setShortcutTargetMode('route');
                            setShortcutForm((c) => ({ ...c, target: option.href }));
                            setShortcutFormErrors((c) => ({ ...c, target: undefined }));
                          }}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition',
                            isSelected
                              ? 'border-primary/50 bg-primary text-primary-foreground shadow-[0_6px_14px_rgba(15,22,26,0.18)]'
                              : 'border-border/60 bg-background/70 text-foreground hover:border-primary/30 hover:bg-primary/[0.06]',
                          ].join(' ')}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  Ações
                </p>
                <div className="flex flex-wrap gap-2">
                  {SHORTCUT_ACTIONS.map((action) => {
                    const Icon = ACTION_ICONS[action.id];
                    const isSelected = shortcutTargetMode === 'action' && shortcutForm.target === action.id;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        disabled={shortcutSaving}
                        title={action.description}
                        onClick={() => {
                          setShortcutTargetMode('action');
                          setShortcutForm((c) => ({ ...c, target: action.id, openInNewTab: false }));
                          setShortcutFormErrors((c) => ({ ...c, target: undefined }));
                        }}
                        className={[
                          'inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition',
                          isSelected
                            ? 'border-primary/50 bg-primary text-primary-foreground shadow-[0_6px_14px_rgba(15,22,26,0.18)]'
                            : 'border-border/60 bg-background/70 text-foreground hover:border-primary/30 hover:bg-primary/[0.06]',
                        ].join(' ')}
                      >
                        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1">
                <div className="mb-3 h-px bg-border/50" />
                <button
                  type="button"
                  disabled={shortcutSaving}
                  onClick={() => {
                    setShortcutTargetMode('external');
                    setShortcutForm((c) => ({ ...c, target: '', openInNewTab: true }));
                    setShortcutFormErrors((c) => ({ ...c, target: undefined }));
                  }}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition',
                    shortcutTargetMode === 'external'
                      ? 'border-primary/50 bg-primary text-primary-foreground shadow-[0_6px_14px_rgba(15,22,26,0.18)]'
                      : 'border-border/60 bg-background/70 text-foreground hover:border-primary/30 hover:bg-primary/[0.06]',
                  ].join(' ')}
                >
                  <Globe className="h-3.5 w-3.5" />
                  URL externa
                </button>

                {shortcutTargetMode === 'external' ? (
                  <div className="mt-2.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={shortcutForm.target}
                        onChange={(event) =>
                          setShortcutForm((c) => ({ ...c, target: event.target.value }))
                        }
                        className="fac-input pl-9 text-[13px]"
                        disabled={shortcutSaving}
                        placeholder="https://exemplo.com"
                        autoFocus
                      />
                      <ExternalLink className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {shortcutFormErrors.target ? (
              <p className="text-[12px] text-rose-600">{shortcutFormErrors.target}</p>
            ) : null}
          </div>

          {shortcutTargetMode === 'action' ? null : (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-border/60 bg-card/60 px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-foreground">Abrir em nova aba</p>
              <p className="text-[12px] text-muted-foreground">
                {shortcutForm.openInNewTab ? 'A página atual permanece aberta.' : 'Navega na aba atual.'}
              </p>
            </div>
            <button
              type="button"
              className={`fac-toggle shrink-0 ${shortcutSaving ? 'cursor-not-allowed opacity-50' : ''}`}
              data-state={shortcutForm.openInNewTab ? 'on' : 'off'}
              onClick={() =>
                setShortcutForm((current) => ({ ...current, openInNewTab: !current.openInNewTab }))
              }
              disabled={shortcutSaving}
              aria-pressed={shortcutForm.openInNewTab}
              aria-label="Alternar abertura em nova aba"
            >
              <span className="fac-toggle-dot" />
            </button>
          </label>
          )}

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Descrição <span className="normal-case tracking-normal font-normal">(opcional)</span>
            </p>
            <input
              id="shortcut-description"
              type="text"
              value={shortcutForm.description}
              onChange={(event) =>
                setShortcutForm((current) => ({ ...current, description: event.target.value }))
              }
              className="fac-input"
              disabled={shortcutSaving}
              placeholder="Ex.: Abre a tela de gerenciamento de links."
            />
          </div>
        </div>
      </AdminModal>

      <ConfirmModal
        open={Boolean(shortcutDeleteTarget)}
        title="Remover atalho"
        description={
          shortcutDeleteTarget
            ? `O atalho "${shortcutDeleteTarget.title}" sera removido do catalogo global.`
            : 'O atalho selecionado sera removido do catalogo global.'
        }
        confirmLabel="Remover atalho"
        loading={shortcutRemoving}
        onConfirm={handleRemoveShortcut}
        onClose={() => setShortcutDeleteTarget(null)}
      />
    </div>
  );
}
