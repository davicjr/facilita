'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminFilterSelect from '@/components/admin/filter-select';
import FileViewerModal from '@/components/admin/file-viewer-modal';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import CardCarousel from '@/components/card-carousel';
import ShareItemCard from '@/components/share-item-card';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import type { Category, Share } from '@/types';

type ShareTypeFilter = 'ALL' | Share['entityType'];

function getShareCounterparty(share: Share, variant: 'received' | 'sent') {
  return variant === 'received' ? share.owner : share.recipient;
}

function getShareTitle(share: Share) {
  if (share.entityType === 'LINK') return share.link?.title || 'Link';
  if (share.entityType === 'SCHEDULE') return share.schedule?.title || 'Documento';
  return share.note?.title || 'Nota';
}

function getShareCategory(share: Share) {
  if (share.entityType === 'LINK') return share.link?.category?.name;
  if (share.entityType === 'SCHEDULE') return share.schedule?.category?.name;
  return share.note?.category?.name;
}

function getShareStatus(share: Share) {
  if (share.entityType === 'LINK') return share.link?.status || 'ACTIVE';
  if (share.entityType === 'SCHEDULE') return share.schedule?.status || 'ACTIVE';
  return share.note?.status || 'ACTIVE';
}

function getShareSearchText(share: Share) {
  return [
    getShareTitle(share),
    getShareCategory(share),
    share.owner?.name,
    share.recipient?.name,
    share.localCategory?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function CompartilhadosPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const globalSearch = useUiStore((state) => state.globalSearch);

  const [received, setReceived] = useState<Share[]>([]);
  const [pending, setPending] = useState<Share[]>([]);
  const [sent, setSent] = useState<Share[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: string; url: string; name: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<ShareTypeFilter>('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const canViewLinks = hasPermission(user, 'canViewLinks');
  const canViewSchedules = hasPermission(user, 'canViewSchedules');
  const canViewNotes = hasPermission(user, 'canViewNotes');
  const canManageShares = hasPermission(user, 'canManageShares');

  const isSuperadmin = user?.role === 'SUPERADMIN';

  const load = useCallback(async () => {
    if (!user || isSuperadmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [receivedRes, pendingRes, sentRes, categoriesRes] = await Promise.all([
        api.get('/shares/received'),
        api.get('/shares/pending'),
        api.get('/shares/sent'),
        api.get('/categories'),
      ]);

      setReceived(Array.isArray(receivedRes.data) ? receivedRes.data : []);
      setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setSent(Array.isArray(sentRes.data) ? sentRes.data : []);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar os compartilhamentos.'));
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableTypes = useMemo(
    () =>
      [
        canViewLinks ? 'LINK' : null,
        canViewSchedules ? 'SCHEDULE' : null,
        canViewNotes ? 'NOTE' : null,
      ].filter((type): type is Share['entityType'] => Boolean(type)),
    [canViewLinks, canViewNotes, canViewSchedules],
  );
  const effectiveTypeFilter =
    typeFilter === 'ALL' || availableTypes.includes(typeFilter) ? typeFilter : 'ALL';

  const localCategories = useMemo(
    () => categories.filter((category) => category.status === 'ACTIVE'),
    [categories],
  );

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();

    received.forEach((share) => {
      const user = getShareCounterparty(share, 'received');
      if (user?.name) {
        map.set(user.id || `received:${user.name}`, user.name);
      }
    });

    sent.forEach((share) => {
      const user = getShareCounterparty(share, 'sent');
      if (user?.name) {
        map.set(user.id || `sent:${user.name}`, user.name);
      }
    });

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [received, sent]);

  const searchTerm = globalSearch.trim().toLowerCase();
  const activeSearch = globalSearch.trim();

  const filterShares = useCallback(
    (shares: Share[], variant: 'received' | 'sent') =>
      shares
        .filter((share) =>
          effectiveTypeFilter === 'ALL' ? true : share.entityType === effectiveTypeFilter,
        )
        .filter((share) => {
          if (userFilter === 'ALL') return true;
          const counterparty = getShareCounterparty(share, variant);
          return (counterparty?.id || `${variant}:${counterparty?.name || ''}`) === userFilter;
        })
        .filter((share) => {
          if (!searchTerm) return true;
          return getShareSearchText(share).includes(searchTerm);
        })
        .sort((a, b) => getShareTitle(a).localeCompare(getShareTitle(b))),
    [effectiveTypeFilter, searchTerm, userFilter],
  );

  const filteredReceived = useMemo(
    () => filterShares(received, 'received'),
    [filterShares, received],
  );
  const filteredSent = useMemo(() => filterShares(sent, 'sent'), [filterShares, sent]);
  const totalFiltered = filteredReceived.length + filteredSent.length;

  const approveShare = async (shareId: string) => {
    setProcessingId(shareId);
    try {
      await api.patch(`/shares/${shareId}/approve`);
      // aprovado sai de pendentes; recarrega para trazer para "Recebidos"
      setPending((prev) => prev.filter((share) => share.id !== shareId));
      await load();
    } finally {
      setProcessingId(null);
    }
  };

  const rejectShare = async (shareId: string) => {
    setProcessingId(shareId);
    try {
      await api.delete(`/shares/${shareId}/reject`);
      setPending((prev) => prev.filter((share) => share.id !== shareId));
    } finally {
      setProcessingId(null);
    }
  };

  const removeReceived = async (shareId: string) => {
    setProcessingId(shareId);
    try {
      await api.delete(`/shares/${shareId}/remove`);
      setReceived((prev) => prev.filter((share) => share.id !== shareId));
    } finally {
      setProcessingId(null);
    }
  };

  const updateLocalCategory = async (shareId: string, categoryId: string) => {
    setProcessingId(shareId);
    try {
      await api.patch(`/shares/${shareId}/local-category`, {
        categoryId: categoryId || null,
      });

      setReceived((prev) =>
        prev.map((share) =>
          share.id === shareId
            ? {
                ...share,
                localCategoryId: categoryId || null,
                localCategory: categoryId
                  ? localCategories.find((category) => category.id === categoryId) || null
                  : null,
              }
            : share,
        ),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const openShare = (share: Share) => {
    if (getShareStatus(share) !== 'ACTIVE') return;

    if (share.entityType === 'LINK' && share.link?.id) {
      router.push(`/admin/links?edit=${share.link.id}`);
      return;
    }

    if (share.entityType === 'SCHEDULE' && share.schedule?.id) {
      router.push(`/admin/schedules?edit=${share.schedule.id}`);
      return;
    }

    if (share.entityType === 'NOTE' && share.note?.id) {
      router.push(`/admin/notes?edit=${share.note.id}`);
    }
  };

  if (isSuperadmin) {
    return (
      <div className="fac-page">
        <section className="fac-panel">
          <AdminPanelHeaderBar title="Compartilhados" count={0} />
          <div className="fac-panel-body">
            <div className="fac-empty-state">
              Superadmin nao participa do fluxo de compartilhamento.
            </div>
          </div>
        </section>
      </div>
    );
  }

  const typeLabel = (share: Share) =>
    share.entityType === 'LINK' ? 'Link' : share.entityType === 'SCHEDULE' ? 'Documento' : 'Nota';

  return (
    <div className="fac-page">
      {pending.length > 0 ? (
        <section className="fac-panel border-2 border-primary/40">
          <AdminPanelHeaderBar title="Aguardando sua aprovação" count={pending.length} />
          <div className="fac-panel-body space-y-2">
            <p className="text-[13px] text-muted-foreground">
              Estes itens foram compartilhados com você e só aparecem em &quot;Recebidos&quot; depois que você aprovar.
            </p>
            {pending.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-3 rounded-[13px] border border-border/60 bg-background/60 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-foreground">
                    {getShareTitle(share)}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {typeLabel(share)} · de {share.owner?.name ?? 'usuário'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => approveShare(share.id)}
                    disabled={processingId === share.id}
                    className="rounded-[10px] border border-primary/60 bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectShare(share.id)}
                    disabled={processingId === share.id}
                    className="rounded-[10px] border border-border/70 bg-background px-3 py-2 text-[12px] font-medium text-foreground transition hover:bg-muted/60 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Compartilhados"
          count={totalFiltered}
          actionsClassName="sm:grid-cols-2 lg:grid-cols-[180px_180px]"
          actions={
            <>
              <AdminFilterSelect
                value={effectiveTypeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as ShareTypeFilter)
                }
              >
                <option value="ALL">Todos os tipos</option>
                {canViewLinks ? <option value="LINK">Links</option> : null}
                {canViewSchedules ? <option value="SCHEDULE">Documentos</option> : null}
                {canViewNotes ? <option value="NOTE">Notas</option> : null}
              </AdminFilterSelect>

              <AdminFilterSelect
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
              >
                <option value="ALL">Todos os usuários</option>
                {userOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </AdminFilterSelect>
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
            <div className="fac-loading-state">Carregando compartilhamentos...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="fac-form-card min-w-0">
                <div className="mb-4 flex items-center gap-3">
                  <p className="fac-form-title !mb-0">Recebidos</p>
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/60 bg-primary px-2 text-[12px] font-medium text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.18)]">
                    {filteredReceived.length}
                  </div>
                </div>

                {filteredReceived.length === 0 ? (
                  <div className="fac-empty-state">Nenhum item recebido.</div>
                ) : (
                  <CardCarousel
                    items={filteredReceived.map((share) => (
                      <ShareItemCard
                        key={share.id}
                        share={share}
                        variant="received"
                        processingId={processingId}
                        localCategories={localCategories}
                        onOpen={openShare}
                        onOpenFile={(id, url, name) => setViewingFile({ id, url, name })}
                        onRemove={canManageShares ? removeReceived : undefined}
                        onUpdateCategory={canManageShares ? updateLocalCategory : undefined}
                      />
                    ))}
                  />
                )}
              </section>

              <section className="fac-form-card min-w-0">
                <div className="mb-4 flex items-center gap-3">
                  <p className="fac-form-title !mb-0">Enviados</p>
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-full border border-primary/60 bg-primary px-2 text-[12px] font-medium text-primary-foreground shadow-[0_8px_18px_rgba(15,22,26,0.18)]">
                    {filteredSent.length}
                  </div>
                </div>

                {filteredSent.length === 0 ? (
                  <div className="fac-empty-state">Nenhum item enviado.</div>
                ) : (
                  <CardCarousel
                    items={filteredSent.map((share) => (
                      <ShareItemCard
                        key={share.id}
                        share={share}
                        variant="sent"
                        processingId={processingId}
                        localCategories={localCategories}
                        onOpen={openShare}
                        onOpenFile={(id, url, name) => setViewingFile({ id, url, name })}
                      />
                    ))}
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </section>

      <FileViewerModal
        open={Boolean(viewingFile)}
        scheduleId={viewingFile?.id}
        fileName={viewingFile?.name ?? ''}
        fileUrl={viewingFile?.url ?? ''}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
}
