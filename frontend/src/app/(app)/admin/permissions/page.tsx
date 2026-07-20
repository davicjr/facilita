'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Folder,
  Home,
  ImageIcon,
  Link2,
  Settings2,
  Share2,
  StickyNote,
  Users,
  type LucideIcon,
} from 'lucide-react';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { getUserRoleLabel } from '@/lib/user-role';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { RolePermission, UserRole } from '@/types';

type EditablePermission = Exclude<
  keyof RolePermission,
  'id' | 'role' | 'createdAt' | 'updatedAt'
>;

type PermissionDefinition = {
  label: string;
  description: string;
};

type PermissionGroup = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  permissions: EditablePermission[];
};

const labelCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const roleOrder: UserRole[] = ['SUPERADMIN', 'USER'];

const permissionDefinitions: Record<EditablePermission, PermissionDefinition> = {
  canViewHome: {
    label: 'Ver inicio',
    description: 'Libera a pagina inicial autenticada do sistema.',
  },
  canViewDashboard: {
    label: 'Ver dashboard',
    description: 'Libera indicadores, metricas e visao geral do sistema.',
  },
  canViewFavorites: {
    label: 'Ver favoritos',
    description: 'Libera a pagina de favoritos do usuario.',
  },
  canViewSharesPage: {
    label: 'Ver compartilhados',
    description: 'Mostra a pagina de recebidos e enviados no fluxo de compartilhamento.',
  },
  canViewUsers: {
    label: 'Ver usuarios',
    description: 'Mostra a listagem e os detalhes dos usuarios cadastrados.',
  },
  canCreateUsers: {
    label: 'Criar usuarios',
    description: 'Autoriza o cadastro de novos usuarios.',
  },
  canEditUsers: {
    label: 'Editar usuarios',
    description: 'Libera alteracoes de perfil e status dos usuarios.',
  },
  canDeleteUsers: {
    label: 'Excluir usuarios',
    description: 'Permite remover usuarios existentes.',
  },
  canViewCategories: {
    label: 'Ver categorias',
    description: 'Libera a pagina de categorias e a leitura das categorias do portal.',
  },
  canManageCategories: {
    label: 'Gerenciar categorias',
    description: 'Permite criar e ajustar categorias do portal.',
  },
  canViewLinks: {
    label: 'Ver links',
    description: 'Libera a pagina de links e a visualizacao dos links conforme o escopo.',
  },
  canManageLinks: {
    label: 'Gerenciar links',
    description: 'Libera criacao, edicao, exclusao e ordenacao de links.',
  },
  canViewSchedules: {
    label: 'Ver documentos',
    description: 'Libera a pagina de documentos e a visualizacao dos arquivos do portal.',
  },
  canManageSchedules: {
    label: 'Gerenciar documentos',
    description: 'Libera upload, edicao e remocao de documentos.',
  },
  canViewNotes: {
    label: 'Ver notas',
    description: 'Libera a pagina de notas e a leitura das notas do portal.',
  },
  canManageNotes: {
    label: 'Gerenciar notas',
    description: 'Permite criar, editar, excluir e alterar status das notas.',
  },
  canViewImages: {
    label: 'Ver galeria',
    description: 'Libera a pagina da galeria de imagens.',
  },
  canManageImages: {
    label: 'Gerenciar galeria',
    description: 'Permite editar metadados e excluir imagens na galeria.',
  },
  canBackupSystem: {
    label: 'Executar backup',
    description: 'Permite gerar backups da base e dos arquivos.',
  },
  canResetSystem: {
    label: 'Executar reset',
    description: 'Libera rotinas destrutivas de limpeza e reset.',
  },
  canManageSystemConfig: {
    label: 'Gerenciar configuracoes',
    description: 'Permite editar configuracoes globais do portal.',
  },
  canManageShares: {
    label: 'Gerenciar compartilhamentos',
    description: 'Libera operacoes de compartilhamento e revogacao.',
  },
};

const rawPermissionGroups: PermissionGroup[] = [
  {
    id: 'administration',
    title: 'Administracao',
    description: 'Acesso ao admin, painel geral e operacoes sensiveis do sistema.',
    icon: Settings2,
    permissions: [
      'canBackupSystem',
      'canManageSystemConfig',
      'canResetSystem',
      'canViewDashboard',
    ],
  },
  {
    id: 'navigation',
    title: 'Navegacao',
    description: 'Paginas principais do aplicativo fora dos modulos administrativos.',
    icon: Home,
    permissions: [
      'canViewFavorites',
      'canViewHome',
      'canViewSharesPage',
    ],
  },
  {
    id: 'users',
    title: 'Usuarios',
    description: 'Cadastro, manutencao e governanca de contas.',
    icon: Users,
    permissions: [
      'canViewUsers',
      'canCreateUsers',
      'canEditUsers',
      'canDeleteUsers',
    ],
  },
  {
    id: 'categories',
    title: 'Categorias',
    description: 'Leitura e administracao das categorias do portal.',
    icon: Folder,
    permissions: ['canViewCategories', 'canManageCategories'],
  },
  {
    id: 'links',
    title: 'Links',
    description: 'Visualizacao e operacoes sobre links do portal.',
    icon: Link2,
    permissions: ['canViewLinks', 'canManageLinks'],
  },
  {
    id: 'documents',
    title: 'Documentos',
    description: 'Leitura e manutencao dos arquivos e documentos.',
    icon: FileText,
    permissions: ['canViewSchedules', 'canManageSchedules'],
  },
  {
    id: 'notes',
    title: 'Notas',
    description: 'Acesso e administracao das notas internas.',
    icon: StickyNote,
    permissions: ['canViewNotes', 'canManageNotes'],
  },
  {
    id: 'gallery',
    title: 'Galeria',
    description: 'Biblioteca de imagens e operacoes da galeria.',
    icon: ImageIcon,
    permissions: [
      'canViewImages',
      'canManageImages',
    ],
  },
  {
    id: 'shares',
    title: 'Compartilhamento',
    description: 'Fluxo de envio, controle e revogacao entre usuarios.',
    icon: Share2,
    permissions: ['canManageShares'],
  },
];

const permissionGroups: PermissionGroup[] = rawPermissionGroups
  .map((group) => ({
    ...group,
    permissions: [...group.permissions].sort((left, right) =>
      labelCollator.compare(
        permissionDefinitions[left].label,
        permissionDefinitions[right].label,
      ),
    ),
  }))
  .sort((left, right) => labelCollator.compare(left.title, right.title));

const roleMeta: Record<
  UserRole,
  {
    title: string;
    description: string;
    badge: string;
    scope: string;
  }
> = {
  SUPERADMIN: {
    title: getUserRoleLabel('SUPERADMIN'),
    description: 'Controle administrativo completo sobre operacao, cadastros e sistema.',
    badge: 'Controle total',
    scope: 'Administracao global',
  },
  USER: {
    title: getUserRoleLabel('USER'),
    description: 'Perfil de usuário com acesso operacional para uso diario, conteudo e compartilhamentos.',
    badge: 'Operacao',
    scope: 'Fluxo do portal',
  },
};

const selectedRoleTone = {
  activeButton:
    'border-primary/60 bg-primary/[0.14] ring-1 ring-primary/25 shadow-[0_12px_28px_rgba(15,22,26,0.14)]',
  rail: 'bg-primary',
  countBadge: 'border-primary/25 bg-primary/[0.12] text-foreground',
  currentBadge:
    'border-primary/60 bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.14)]',
};

const normalizeRows = (data: RolePermission[]) =>
  [...data].sort(
    (left, right) => roleOrder.indexOf(left.role) - roleOrder.indexOf(right.role),
  );

const countEnabledPermissions = (
  row: RolePermission,
  columns: EditablePermission[],
) => columns.reduce((total, key) => total + (row[key] ? 1 : 0), 0);

const countDirtyPermissions = (
  row: RolePermission,
  baseline: RolePermission | undefined,
  columns: EditablePermission[],
) => {
  if (!baseline) {
    return 0;
  }

  return columns.reduce(
    (total, key) => total + (Boolean(row[key]) !== Boolean(baseline[key]) ? 1 : 0),
    0,
  );
};

const getGroupAnchorId = (role: UserRole, groupId: string) => `${role}-${groupId}`;

const normalizeRolePermissions = (row: RolePermission): RolePermission => {
  const normalized = { ...row };

  if (normalized.canCreateUsers || normalized.canEditUsers || normalized.canDeleteUsers) {
    normalized.canViewUsers = true;
  }

  if (normalized.canManageCategories) {
    normalized.canViewCategories = true;
  }

  if (normalized.canManageLinks) {
    normalized.canViewLinks = true;
  }

  if (normalized.canManageSchedules) {
    normalized.canViewSchedules = true;
  }

  if (normalized.canManageNotes) {
    normalized.canViewNotes = true;
  }

  if (normalized.canManageImages) {
    normalized.canViewImages = true;
  }

  if (normalized.canManageShares) {
    normalized.canViewSharesPage = true;
  }

  return normalized;
};

export default function PermissionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [rows, setRows] = useState<RolePermission[]>([]);
  const [baselineRows, setBaselineRows] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('SUPERADMIN');
  const [activeGroupByRole, setActiveGroupByRole] = useState<
    Partial<Record<UserRole, string>>
  >({});

  const isSuperadmin = user?.role === 'SUPERADMIN';
  const columns = useMemo(
    () => Object.keys(permissionDefinitions) as EditablePermission[],
    [],
  );

  const load = useCallback(async () => {
    if (!isSuperadmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/permissions');
      const data = Array.isArray(response.data) ? normalizeRows(response.data) : [];

      setRows(data);
      setBaselineRows(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nao foi possivel carregar permissoes.'));
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const baselineByRole = useMemo(
    () => new Map(baselineRows.map((row) => [row.role, row])),
    [baselineRows],
  );

  const togglePermission = (role: UserRole, key: EditablePermission) => {
    setRows((prev) =>
      prev.map((row) =>
        row.role === role
          ? normalizeRolePermissions({
              ...row,
              [key]: !row[key],
            })
          : row,
      ),
    );
  };

  const saveRole = async (row: RolePermission) => {
    setSavingRole(row.role);

    try {
      const payload = columns.reduce((acc, key) => {
        acc[key] = Boolean(row[key]);
        return acc;
      }, {} as Record<EditablePermission, boolean>);

      await api.patch(`/permissions/${row.role}`, payload);
      await load();

      if (user?.role === row.role) {
        const response = await api.get('/auth/me', { skipNotify: true });
        setUser(response.data);
        router.refresh();
      }
    } finally {
      setSavingRole(null);
    }
  };

  const activeSearch = globalSearch.trim();

  const visibleRows = useMemo(() => {
    const term = activeSearch.toLowerCase();

    return rows
      .map((row) => {
        const roleMatches = row.role.toLowerCase().includes(term);
        const visibleGroups = permissionGroups
          .map((group) => {
            if (!term || roleMatches) {
              return group;
            }

            const groupMatches = `${group.title} ${group.description}`
              .toLowerCase()
              .includes(term);

            return {
              ...group,
              permissions: group.permissions.filter((permission) => {
                const meta = permissionDefinitions[permission];
                return (
                  groupMatches ||
                  `${meta.label} ${meta.description}`.toLowerCase().includes(term)
                );
              }),
            };
          })
          .filter((group) => group.permissions.length > 0);

        const baseline = baselineByRole.get(row.role);

        return {
          row,
          groups: visibleGroups,
          enabledCount: countEnabledPermissions(row, columns),
          dirtyCount: countDirtyPermissions(row, baseline, columns),
        };
      })
      .filter((entry) => entry.groups.length > 0);
  }, [activeSearch, baselineByRole, columns, rows]);

  const selectedEntry = useMemo(
    () =>
      visibleRows.find((entry) => entry.row.role === selectedRole) ??
      visibleRows[0] ??
      null,
    [selectedRole, visibleRows],
  );

  useEffect(() => {
    if (visibleRows.length === 0) {
      return;
    }

    const hasSelectedRole = visibleRows.some((entry) => entry.row.role === selectedRole);
    if (!hasSelectedRole) {
      setSelectedRole(visibleRows[0].row.role);
    }
  }, [selectedRole, visibleRows]);

  useEffect(() => {
    setActiveGroupByRole((prev) => {
      const next = { ...prev };
      let changed = false;

      visibleRows.forEach(({ row, groups }) => {
        if (groups.length === 0) {
          return;
        }

        const current = next[row.role];
        const hasCurrent = current
          ? groups.some((group) => group.id === current)
          : false;

        if (!hasCurrent) {
          next[row.role] = groups[0].id;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [visibleRows]);

  if (!isSuperadmin) {
    return <div className="fac-error-state">Acesso restrito ao superadmin.</div>;
  }

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Permissoes" count={visibleRows.length} />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {loading ? (
            <div className="fac-loading-state">Carregando permissoes...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : visibleRows.length === 0 ? (
            <div className="fac-empty-state">Nenhuma permissao encontrada.</div>
          ) : (
            <div className="grid gap-4">
              <section className="fac-form-card">
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleRows.map(({ row, enabledCount, dirtyCount }) => {
                    const meta = roleMeta[row.role];
                    const isActive = selectedEntry?.row.role === row.role;

                    return (
                      <button
                        key={`selector-${row.role}`}
                        type="button"
                        className={`relative overflow-hidden flex items-center justify-between gap-3 rounded-[16px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          isActive
                            ? selectedRoleTone.activeButton
                            : 'border-border bg-white/55 hover:border-primary/30 hover:bg-white/75 dark:bg-secondary/55 dark:hover:bg-secondary'
                        }`}
                        onClick={() => setSelectedRole(row.role)}
                        aria-pressed={isActive}
                      >
                        {isActive ? (
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-2 left-2 w-1 rounded-full ${selectedRoleTone.rail}`}
                          />
                        ) : null}

                        <span className="min-w-0 flex-1">
                          <span className="block text-[16px] font-display leading-none text-foreground">
                            {meta.title}
                          </span>
                          <span
                            className={`mt-1 block text-[11px] ${
                              isActive ? 'text-foreground/80' : 'text-muted-foreground'
                            }`}
                          >
                            {meta.scope}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              isActive
                                ? selectedRoleTone.countBadge
                                : 'border-border/80 bg-background/55 text-muted-foreground'
                            }`}
                          >
                            {enabledCount}/{columns.length} permissoes ativas
                          </span>

                          {dirtyCount > 0 ? (
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-amber-600/30 bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                              {dirtyCount}
                            </span>
                          ) : null}

                          {isActive ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${selectedRoleTone.currentBadge}`}>
                              Atual
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedEntry ? (() => {
                const { row, groups, enabledCount, dirtyCount } = selectedEntry;
                const meta = roleMeta[row.role];
                const isSaving = savingRole === row.role;
                const hasChanges = dirtyCount > 0;
                const activeGroupId = activeGroupByRole[row.role] ?? groups[0]?.id;
                const activeGroup =
                  groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null;

                return (
                  <section key={row.role} className="fac-form-card">
                    <div className="flex flex-col gap-4 border-b border-border/70 pb-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-foreground">
                            {meta.badge}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                              hasChanges
                                ? 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                : 'border-border/80 bg-background/55 text-muted-foreground'
                            }`}
                          >
                            {hasChanges ? 'Alterado' : 'Sincronizado'}
                          </span>
                        </div>

                        <div>
                          <h2 className="text-[24px] font-display leading-none text-foreground">
                            {meta.title}
                          </h2>
                          <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
                            {meta.description}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[380px]">
                        {[
                          {
                            label: 'Ativas',
                            value: `${enabledCount}/${columns.length}`,
                            hint: 'Permissoes ligadas para o perfil.',
                          },
                          {
                            label: 'Pendencias',
                            value: hasChanges ? String(dirtyCount) : '0',
                            hint: hasChanges
                              ? 'Alteracoes ainda nao salvas.'
                              : 'Sem alteracoes pendentes.',
                          },
                          {
                            label: 'Escopo',
                            value: meta.scope,
                            hint: 'Faixa principal de uso.',
                          },
                        ].map((item) => (
                          <div
                            key={`${row.role}-${item.label}`}
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

                    <div className="mt-4 rounded-[18px] border border-border/70 bg-white/45 p-3 dark:bg-secondary/40">
                      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                        {groups.map((group) => {
                          const Icon = group.icon;
                          const enabledInGroup = group.permissions.reduce(
                            (total, permission) => total + (row[permission] ? 1 : 0),
                            0,
                          );

                          return (
                            <button
                              key={`${row.role}-nav-${group.id}`}
                              type="button"
                              className={`inline-flex min-w-0 flex-1 items-center justify-between gap-3 rounded-full border px-3 py-2 text-[11px] font-medium transition ${
                                activeGroup?.id === group.id
                                  ? 'border-primary/40 bg-primary/[0.12] text-foreground'
                                  : 'border-border/80 bg-background/60 text-foreground hover:border-primary/35 hover:bg-primary/[0.08]'
                              }`}
                              onClick={() =>
                                setActiveGroupByRole((prev) => ({
                                  ...prev,
                                  [row.role]: group.id,
                                }))
                              }
                              aria-pressed={activeGroup?.id === group.id}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{group.title}</span>
                              </span>
                              <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-0.5 text-[10px] text-muted-foreground">
                                {enabledInGroup}/{group.permissions.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4">
                      {activeGroup ? (() => {
                        const group = activeGroup;
                        const Icon = group.icon;
                        const enabledInGroup = group.permissions.reduce(
                          (total, permission) => total + (row[permission] ? 1 : 0),
                          0,
                        );

                        return (
                          <section
                            key={`${row.role}-${group.id}`}
                            id={getGroupAnchorId(row.role, group.id)}
                            className="scroll-mt-28 rounded-[18px] border border-border bg-white/55 p-4 dark:bg-secondary/55"
                          >
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.08] text-foreground">
                                  <Icon className="h-5 w-5" />
                                </span>

                                <div className="min-w-0">
                                  <p className="fac-form-title !mb-1">{group.title}</p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {group.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/60 bg-primary px-2 text-[12px] font-medium text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.18)]">
                                {enabledInGroup}/{group.permissions.length}
                              </div>
                            </div>

                            <div
                              className={`grid gap-2 ${
                                group.permissions.length > 1 ? 'lg:grid-cols-2' : ''
                              }`}
                            >
                              {group.permissions.map((permission) => {
                                const definition = permissionDefinitions[permission];
                                const checked = Boolean(row[permission]);

                                return (
                                  <div
                                    key={`${row.role}-${permission}`}
                                    className="flex items-center gap-3 rounded-[16px] border border-border/70 bg-card/80 px-3 py-3"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[13px] font-semibold text-foreground">
                                        {definition.label}
                                      </p>
                                      <p className="mt-1 text-[12px] text-muted-foreground">
                                        {definition.description}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      className={`fac-toggle shrink-0 ${
                                        isSaving ? 'cursor-not-allowed opacity-50' : ''
                                      }`}
                                      data-state={checked ? 'on' : 'off'}
                                      onClick={() => togglePermission(row.role, permission)}
                                      disabled={isSaving}
                                      aria-pressed={checked}
                                      aria-label={`${checked ? 'Desativar' : 'Ativar'} ${definition.label}`}
                                    >
                                      <span className="fac-toggle-dot" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })() : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
                        <p className="text-[12px] text-muted-foreground">
                          {hasChanges
                          ? `${dirtyCount} alteracao(oes) pronta(s) para salvar neste perfil.`
                          : 'Nenhuma alteracao pendente neste perfil.'}
                        </p>

                      <button
                        type="button"
                        className="fac-button-primary text-[11px]"
                        onClick={() => {
                          void saveRole(row);
                        }}
                        disabled={isSaving || !hasChanges}
                      >
                        {isSaving ? 'Salvando...' : 'Salvar permissoes'}
                      </button>
                    </div>
                  </section>
                );
              })() : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
