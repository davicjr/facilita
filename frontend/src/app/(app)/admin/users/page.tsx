'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AvatarUpload from '@/components/admin/avatar-upload';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminFilterSelect from '@/components/admin/filter-select';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import AdminModal from '@/components/admin/modal';
import Pagination from '@/components/admin/pagination';
import AdminUserCard from '@/components/admin/user-card';
import useClientPagination from '@/hooks/use-client-pagination';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { parseImagePosition } from '@/lib/image';
import { hasAllPermissions, hasPermission } from '@/lib/permissions';
import { getUserRoleLabel } from '@/lib/user-role';
import {
  buildUserTheme,
  getUserCardVisual,
  getUserTheme,
} from '@/lib/user-card-visual';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { User, UserRole, UserStatus } from '@/types';

type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string;
  theme: Record<string, unknown>;
  imagePosition: string;
  imageScale: number;
};

const defaultUserCardVisual = {
  imagePosition: '50% 50%',
  imageScale: 1,
};

const emptyForm: UserFormState = {
  name: '',
  username: '',
  password: '',
  role: 'USER' as UserRole,
  status: 'ACTIVE' as UserStatus,
  avatarUrl: '',
  theme: {},
  imagePosition: defaultUserCardVisual.imagePosition,
  imageScale: defaultUserCardVisual.imageScale,
};

type FormTab = 'DATA' | 'VISUAL';
type UserFormErrors = {
  name?: string;
  username?: string;
  password?: string;
};

export default function UsersPage() {
  const authUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>({ ...emptyForm });
  const [formTab, setFormTab] = useState<FormTab>('DATA');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const canViewUsers = hasAllPermissions(authUser, ['canViewUsers']);
  const canCreateUsers = hasPermission(authUser, 'canCreateUsers');
  const canEditUsers = hasPermission(authUser, 'canEditUsers');
  const canDeleteUsers = hasPermission(authUser, 'canDeleteUsers');

  const load = useCallback(async () => {
    if (!canViewUsers) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar usuários.'));
    } finally {
      setLoading(false);
    }
  }, [canViewUsers]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return users
      .filter((user) => (roleFilter === 'ALL' ? true : user.role === roleFilter))
      .filter((user) => (statusFilter === 'ALL' ? true : user.status === statusFilter))
      .filter((user) => {
        if (!term) return true;
        return `${user.name} ${user.email}`.toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, globalSearch, roleFilter, statusFilter]);

  const {
    containerRef: gridRef,
    pageItems: pagedUsers,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filtered);

  const imagePosition = useMemo(
    () => parseImagePosition(form.imagePosition),
    [form.imagePosition],
  );

  const openCreate = () => {
    if (!canCreateUsers) {
      return;
    }

    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormTab('DATA');
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    if (!canEditUsers && !canDeleteUsers) {
      return;
    }

    const visual = getUserCardVisual(user.theme);

    setEditing(user);
    setForm({
      name: user.name,
      username: user.email,
      password: '',
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl || '',
      theme: getUserTheme(user.theme),
      imagePosition: visual.imagePosition,
      imageScale: visual.imageScale,
    });
    setFormErrors({});
    setFormTab('DATA');
    setModalOpen(true);
  };

  const validateForm = () => {
    const nextErrors: UserFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nome é obrigatório.';
    }

    if (!form.username.trim()) {
      nextErrors.username = 'Usuário é obrigatório.';
    }

    if (!editing && !form.password.trim()) {
      nextErrors.password = 'Senha é obrigatória ao criar usuário.';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormTab('DATA');
    }
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if ((editing && !canEditUsers) || (!editing && !canCreateUsers)) {
      return;
    }

    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, {
          name: form.name,
          username: form.username,
          ...(form.password ? { password: form.password } : {}),
          role: form.role,
          status: form.status,
          avatarUrl: form.avatarUrl || undefined,
          theme: buildUserTheme(form.theme, form.imagePosition, form.imageScale),
        });
      } else {
        await api.post('/users', {
          name: form.name,
          username: form.username,
          password: form.password,
          role: form.role,
          status: form.status,
          avatarUrl: form.avatarUrl || undefined,
          theme: buildUserTheme(form.theme, form.imagePosition, form.imageScale),
        });
      }

      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    if (!canEditUsers) {
      return;
    }

    try {
      await api.patch(`/users/${user.id}`, {
        status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
    } catch {
      // O interceptor global já notifica o erro.
    } finally {
      await load();
    }
  };

  const remove = async () => {
    if (!confirmTarget) return;
    if (confirmTarget.id === authUser?.id) return;
    if (!canDeleteUsers) return;

    setDeleting(true);
    try {
      await api.delete(`/users/${confirmTarget.id}`);
      setModalOpen(false);
      setEditing(null);
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
      await load();
    }
  };

  if (!canViewUsers) {
    return (
      <div className="fac-error-state">Acesso restrito.</div>
    );
  }

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Usuários"
          count={filtered.length}
          actionsClassName="sm:grid-cols-2 lg:grid-cols-[180px_180px_auto]"
          actions={
            <>
              <AdminFilterSelect
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as 'ALL' | UserRole)}
              >
                <option value="ALL">Todos os perfis</option>
                <option value="SUPERADMIN">{getUserRoleLabel('SUPERADMIN')}</option>
                <option value="USER">{getUserRoleLabel('USER')}</option>
              </AdminFilterSelect>

              <AdminFilterSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | UserStatus)
                }
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </AdminFilterSelect>

              <button
                type="button"
                className="fac-button-primary !h-10 !w-10 !rounded-full !px-0 !tracking-normal transition-colors duration-200 hover:!bg-accent hover:!text-accent-foreground"
                onClick={openCreate}
                aria-label="Novo usuário"
                title="Novo usuário"
                disabled={!canCreateUsers}
              >
                <span className="text-[22px] leading-none">+</span>
              </button>
            </>
          }
        />

        <div className="fac-panel-body">
          {loading ? (
            <div className="fac-loading-state">Carregando usuários...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="fac-empty-state">Nenhum usuário encontrado.</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
                {pagedUsers.map((user) => (
                  <AdminUserCard
                    key={user.id}
                    user={user}
                    onEdit={
                      canEditUsers || canDeleteUsers ? () => openEdit(user) : undefined
                    }
                    onToggleStatus={
                      canEditUsers
                        ? () => {
                            void toggleStatus(user);
                          }
                        : undefined
                    }
                    toggleDisabled={user.id === authUser?.id || !canEditUsers}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                hasPreviousPage={hasPreviousPage}
                hasNextPage={hasNextPage}
                onPrevious={previousPage}
                onNext={nextPage}
              />
            </>
          )}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        description="Configure credenciais e acessos do usuário."
        onClose={() => setModalOpen(false)}
        panelClassName="max-w-[820px]"
        footer={
          <>
            {editing && editing.id !== authUser?.id && canDeleteUsers ? (
              <button
                type="button"
                className="fac-button-secondary text-[11px]"
                onClick={() => setConfirmTarget(editing)}
                disabled={saving || deleting}
              >
                {deleting ? 'Removendo...' : 'Remover'}
              </button>
            ) : null}

            <button
              type="button"
              className="fac-button-secondary text-[11px]"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="fac-button-primary text-[11px]"
              onClick={save}
              disabled={
                saving ||
                (editing ? !canEditUsers : !canCreateUsers) ||
                !form.name.trim() ||
                !form.username.trim() ||
                (!editing && !form.password.trim())
              }
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="fac-tabs !grid-cols-2">
          <button
            type="button"
            className="fac-tab"
            data-active={formTab === 'DATA' ? 'true' : 'false'}
            onClick={() => setFormTab('DATA')}
          >
            Dados
          </button>
          <button
            type="button"
            className="fac-tab"
            data-active={formTab === 'VISUAL' ? 'true' : 'false'}
            onClick={() => setFormTab('VISUAL')}
          >
            Visual
          </button>
        </div>

        {formTab === 'DATA' ? (
          <section className="fac-form-card mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="fac-label">Nome</label>
                <input
                  value={form.name}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, name: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`fac-input ${formErrors.name ? 'border-destructive' : ''}`}
                />
                {formErrors.name ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.name}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="fac-label">Usuário</label>
                <input
                  value={form.username}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, username: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, username: undefined }));
                  }}
                  className={`fac-input ${formErrors.username ? 'border-destructive' : ''}`}
                />
                {formErrors.username ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.username}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="fac-label">Senha</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, password: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`fac-input ${formErrors.password ? 'border-destructive' : ''}`}
                  placeholder={editing ? 'Nova senha (opcional)' : ''}
                />
                {formErrors.password ? (
                  <p className="mt-1 text-[12px] text-destructive">{formErrors.password}</p>
                ) : null}
              </div>

              <div>
                <label className="fac-label">Perfil</label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))
                  }
                  className="fac-select"
                  disabled={editing ? !canEditUsers : !canCreateUsers}
                >
                  <option value="USER">{getUserRoleLabel('USER')}</option>
                  <option value="SUPERADMIN">{getUserRoleLabel('SUPERADMIN')}</option>
                </select>
              </div>

              <div>
                <label className="fac-label">Status</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, status: event.target.value as UserStatus }))
                  }
                  className="fac-select"
                  disabled={editing ? !canEditUsers : !canCreateUsers}
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="INACTIVE">Inativo</option>
                </select>
              </div>
            </div>
          </section>
        ) : null}

        {formTab === 'VISUAL' ? (
          <div className="mt-4 space-y-4">
            <section className="fac-form-card">
              <label className="fac-label">Foto do usuário</label>
              <AvatarUpload
                value={form.avatarUrl}
                onChange={(url) => setForm((prev) => ({ ...prev, avatarUrl: url }))}
                name={form.name || 'Usuário'}
                disabled={saving}
              />
            </section>

            <section className="fac-form-card">
              <p className="fac-form-title">Prévia do card</p>
              <div
                className={
                  form.avatarUrl
                    ? 'mt-4 grid gap-6 md:grid-cols-[minmax(0,248px)_minmax(0,1fr)] md:items-center'
                    : 'mt-4'
                }
              >
                <div className="flex justify-center md:justify-start">
                  <AdminUserCard
                    user={{
                      name: form.name.trim() || 'Nome do usuário',
                      email: form.username.trim() || 'usuario@facilita.local',
                      role: form.role,
                      status: form.status,
                      avatarUrl: form.avatarUrl,
                      theme: buildUserTheme(form.theme, form.imagePosition, form.imageScale),
                    }}
                    size="preview"
                  />
                </div>

                {form.avatarUrl ? (
                  <div className="grid gap-4">
                    <div>
                      <label className="fac-label">Largura</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={imagePosition.x}
                        onChange={(event) => {
                          const nextX = Number.parseInt(event.target.value, 10);
                          setForm((prev) => ({
                            ...prev,
                            imagePosition: `${nextX}% ${imagePosition.y}%`,
                          }));
                        }}
                        className="w-full"
                      />
                      <p className="mt-1 text-[12px] text-muted-foreground">{imagePosition.x}%</p>
                    </div>

                    <div>
                      <label className="fac-label">Altura</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={imagePosition.y}
                        onChange={(event) => {
                          const nextY = Number.parseInt(event.target.value, 10);
                          setForm((prev) => ({
                            ...prev,
                            imagePosition: `${imagePosition.x}% ${nextY}%`,
                          }));
                        }}
                        className="w-full"
                      />
                      <p className="mt-1 text-[12px] text-muted-foreground">{imagePosition.y}%</p>
                    </div>

                    <div>
                      <label className="fac-label">Zoom</label>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={form.imageScale}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            imageScale: Number.parseFloat(event.target.value),
                          }))
                        }
                        className="w-full"
                      />
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {form.imageScale.toFixed(1)}x
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </AdminModal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Remover usuário"
        description={
          confirmTarget
            ? `Confirma a remoção permanente do usuário "${confirmTarget.name}"?`
            : 'Confirma a remoção permanente deste usuário?'
        }
        confirmLabel="Remover usuário"
        loading={deleting}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
