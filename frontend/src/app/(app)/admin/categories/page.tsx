'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminCategoryCard from '@/components/admin/category-card';
import ColorPicker from '@/components/admin/color-picker';
import IconPicker from '@/components/admin/icon-picker';
import ConfirmModal from '@/components/admin/confirm-modal';
import AdminFilterSelect from '@/components/admin/filter-select';
import AdminModal from '@/components/admin/modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import Pagination from '@/components/admin/pagination';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { hasPermission } from '@/lib/permissions';
import useClientPagination from '@/hooks/use-client-pagination';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { Category } from '@/types';

const emptyForm = {
  name: '',
  color: '#3b82f6',
  icon: '',
  adminOnly: false,
};
type CategoryFormErrors = {
  name?: string;
};

export default function CategoriesPage() {
  const authUser = useAuthStore((state) => state.user);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const globalSearch = useUiStore((state) => state.globalSearch);
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<CategoryFormErrors>({});
  const [deleting, setDeleting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/categories', { params: { includeInactive: true } });
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar categorias.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isSuperadmin = authUser?.role === 'SUPERADMIN';
  const canManageCategories = hasPermission(authUser, 'canManageCategories');

  const ownerOptions = useMemo(() => {
    const owners = new Map<string, string>();

    categories.forEach((category) => {
      if (category.owner?.id && category.owner.name) {
        owners.set(category.owner.id, category.owner.name);
      }
    });

    return [...owners.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();

    return categories
      .filter((category) => (ownerFilter === 'ALL' ? true : category.owner?.id === ownerFilter))
      .filter((category) => (statusFilter === 'ALL' ? true : category.status === statusFilter))
      .filter((category) => {
        if (!term) return true;
        return category.name.toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, globalSearch, ownerFilter, statusFilter]);
  const activeSearch = globalSearch.trim();

  const {
    containerRef: gridRef,
    pageItems: pagedCategories,
    page,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    nextPage,
    previousPage,
  } = useClientPagination(filtered, { cardWidth: 300 });

  const openCreate = () => {
    if (!canManageCategories) {
      return;
    }

    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    if (!canManageCategories) {
      return;
    }

    setEditing(category);
    setForm({
      name: category.name,
      color: category.color || '#3b82f6',
      icon: category.icon || '',
      adminOnly: category.adminOnly,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const nextErrors: CategoryFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nome é obrigatório.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!canManageCategories) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, {
          name: form.name,
          color: form.color,
          icon: form.icon || null,
          adminOnly: form.adminOnly,
        });
      } else {
        await api.post('/categories', {
          name: form.name,
          color: form.color,
          icon: form.icon || null,
          adminOnly: form.adminOnly,
        });
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category: Category) => {
    if (!canManageCategories) return;
    try {
      await api.patch(`/categories/${category.id}`, {
        status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
    } catch {
      // O interceptor global já notifica o erro.
    } finally {
      await load();
    }
  };

  const remove = async () => {
    if (!canManageCategories) return;
    if (!confirmTarget) return;

    setDeleting(true);
    try {
      await api.delete(`/categories/${confirmTarget.id}`);
      setModalOpen(false);
      setEditing(null);
    } finally {
      setDeleting(false);
      setConfirmTarget(null);
      await load();
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Categorias"
          count={filtered.length}
          actionsClassName={
            isSuperadmin
              ? 'sm:grid-cols-[180px_180px_auto]'
              : 'sm:grid-cols-[180px_auto]'
          }
          actions={
            <>
              {isSuperadmin ? (
                <AdminFilterSelect
                  value={ownerFilter}
                  onChange={(event) => setOwnerFilter(event.target.value)}
                >
                  <option value="ALL">Todos os usuários</option>
                  {ownerOptions.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name}
                    </option>
                  ))}
                </AdminFilterSelect>
              ) : null}

              <AdminFilterSelect
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
                }
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </AdminFilterSelect>

              <button
                type="button"
                className="fac-button-primary !h-10 !w-10 !rounded-full !px-0 !tracking-normal transition-colors duration-200 hover:!bg-accent hover:!text-accent-foreground"
                onClick={openCreate}
                aria-label="Nova categoria"
                title="Nova categoria"
                disabled={!canManageCategories}
              >
                <span className="text-[22px] leading-none">+</span>
              </button>
            </>
          }
        />

        <div className="fac-panel-body space-y-4">
          {activeSearch ? (
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Busca ativa:{' '}
              <span className="normal-case tracking-normal text-foreground">{activeSearch}</span>
            </p>
          ) : null}

          {loading ? (
            <div className="fac-loading-state">Carregando categorias...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="fac-empty-state">Nenhuma categoria encontrada.</div>
          ) : (
            <>
              <div ref={gridRef} className="flex flex-wrap items-start gap-3">
                {pagedCategories.map((category) => (
                  <AdminCategoryCard
                    key={category.id}
                    category={category}
                    onEdit={canManageCategories ? () => openEdit(category) : undefined}
                    onToggleStatus={
                      canManageCategories
                        ? () => {
                            void toggleStatus(category);
                          }
                        : undefined
                    }
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
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description="Categorias organizam links e documentos."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            {editing && canManageCategories ? (
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
              disabled={saving || !canManageCategories || !form.name.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <section className="fac-form-card">
          <p className="fac-form-title">Configuração</p>

          <div className="grid gap-4">
            <div>
              <label className="fac-label" htmlFor="category-name">Nome</label>
              <input
                id="category-name"
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

            <div>
              <label className="fac-label">Ícone (opcional)</label>
              <IconPicker
                value={form.icon}
                onChange={(icon) => setForm((prev) => ({ ...prev, icon }))}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-10">
              <div>
                <label className="fac-label">Cor</label>
                <ColorPicker
                  value={form.color}
                  onChange={(color) => setForm((prev) => ({ ...prev, color }))}
                />
              </div>

              <div>
                <label className="fac-label">Permissão</label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    className={`fac-button-secondary !justify-start !px-4 !normal-case !tracking-normal ${
                      !form.adminOnly
                        ? '!border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90'
                        : ''
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, adminOnly: false }))}
                  >
                    Usuário
                  </button>
                  <button
                    type="button"
                    className={`fac-button-secondary !justify-start !px-4 !normal-case !tracking-normal ${
                      form.adminOnly
                        ? '!border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90'
                        : ''
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, adminOnly: true }))}
                  >
                    Somente admins
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Define quem pode visualizar itens desta categoria.
                </p>
              </div>
            </div>
          </div>
        </section>
      </AdminModal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title="Remover categoria"
        description={
          confirmTarget
            ? `Confirma a remoção permanente da categoria "${confirmTarget.name}"?`
            : 'Confirma a remoção permanente desta categoria?'
        }
        confirmLabel="Remover categoria"
        loading={deleting}
        onConfirm={() => {
          void remove();
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}
