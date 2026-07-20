'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/user-avatar';
import AdminModal from './modal';

type ShareEntityType = 'LINK' | 'SCHEDULE' | 'NOTE';

type ShareRecipient = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  alreadyShared?: boolean;
  activeShareId?: string | null;
};

type ShareContentModalProps = {
  open: boolean;
  entityType: ShareEntityType;
  entityId: string | null;
  entityTitle: string;
  onClose: () => void;
  onShared?: () => void | Promise<void>;
};

type CreatedShare = {
  id?: string;
  recipientId?: string;
};

const normalizeRecipientValue = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getRecipientSecondaryLabel = (recipient: ShareRecipient) => {
  const email = recipient.email?.trim();
  if (!email) {
    return null;
  }

  const normalizedName = normalizeRecipientValue(recipient.name);
  if (!email.includes('@')) {
    return normalizeRecipientValue(email) === normalizedName ? null : `@${email}`;
  }

  const [localPart] = email.split('@');
  return normalizeRecipientValue(localPart) === normalizedName ? null : email;
};

export default function ShareContentModal({
  open,
  entityType,
  entityId,
  entityTitle,
  onClose,
  onShared,
}: ShareContentModalProps) {
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sharingRecipientId, setSharingRecipientId] = useState<string | null>(null);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRecipients([]);
      setSearch('');
      setError(null);
      setSharingRecipientId(null);
      setRevokingShareId(null);
      return;
    }

    setSearch('');
    setError(null);
    setSharingRecipientId(null);
    setRevokingShareId(null);

    let active = true;
    const loadRecipients = async () => {
      setLoadingRecipients(true);
      setError(null);
      try {
        const response = await api.get('/shares/recipients', {
          params: entityId
            ? {
                entityType,
                entityId,
              }
            : undefined,
          skipNotify: true,
        });
        if (!active) return;
        setRecipients(Array.isArray(response.data) ? response.data : []);
      } catch (err: unknown) {
        if (!active) return;
        setError(getApiErrorMessage(err, 'Nao foi possivel carregar destinatarios.'));
      } finally {
        if (active) setLoadingRecipients(false);
      }
    };

    void loadRecipients();
    return () => {
      active = false;
    };
  }, [entityId, entityType, open]);

  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((recipient) =>
      `${recipient.name} ${recipient.email}`.toLowerCase().includes(term),
    );
  }, [recipients, search]);

  const alreadySharedCount = useMemo(
    () => recipients.filter((recipient) => recipient.alreadyShared).length,
    [recipients],
  );

  const availableRecipientsCount = useMemo(
    () => Math.max(recipients.length - alreadySharedCount, 0),
    [alreadySharedCount, recipients.length],
  );

  const shareRecipient = async (recipient: ShareRecipient) => {
    if (!entityId) return;

    setSharingRecipientId(recipient.id);
    setError(null);
    try {
      const response = await api.post(
        '/shares',
        {
          entityType,
          entityId,
          recipientIds: [recipient.id],
        },
        {
          skipNotify: true,
        },
      );

      const returnedShare = Array.isArray(response.data?.shares)
        ? (response.data.shares.find(
            (item: CreatedShare) => item.recipientId === recipient.id,
          ) ?? response.data.shares[0])
        : null;

      setRecipients((prev) =>
        prev.map((item) =>
          item.id === recipient.id
            ? {
                ...item,
                alreadyShared: true,
                activeShareId:
                  typeof returnedShare?.id === 'string' ? returnedShare.id : item.activeShareId ?? null,
              }
            : item,
        ),
      );

      if (onShared) {
        await onShared();
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nao foi possivel compartilhar.'));
    } finally {
      setSharingRecipientId(null);
    }
  };

  const revokeShare = async (recipient: ShareRecipient) => {
    if (!recipient.activeShareId) return;

    setRevokingShareId(recipient.activeShareId);
    setError(null);
    try {
      await api.delete(`/shares/${recipient.activeShareId}/revoke`, {
        skipNotify: true,
      });

      setRecipients((prev) =>
        prev.map((item) =>
          item.id === recipient.id
            ? {
                ...item,
                alreadyShared: false,
                activeShareId: null,
              }
            : item,
        ),
      );

      if (onShared) {
        await onShared();
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Nao foi possivel revogar o compartilhamento.'));
    } finally {
      setRevokingShareId(null);
    }
  };

  return (
    <AdminModal
      open={open}
      title="Compartilhar"
      description={`Gerencie quem recebe "${entityTitle}".`}
      onClose={onClose}
      panelClassName="max-w-4xl"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar usuario"
            className="w-full rounded-xl border border-border/70 bg-white/80 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none ring-0 transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-primary/35 focus:outline-none focus:ring-0 focus-visible:border-primary/35 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(15,55,65,0.12)] dark:bg-card/85"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-border/70 bg-card/75 px-3 py-1 text-muted-foreground">
            Disponiveis <span className="font-semibold text-foreground">{availableRecipientsCount}</span>
          </span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-emerald-700 dark:text-emerald-300">
            Compartilhados <span className="font-semibold">{alreadySharedCount}</span>
          </span>
        </div>

        {loadingRecipients ? (
          <div className="rounded-lg border border-border/70 bg-card/75 px-4 py-6 text-center text-sm text-muted-foreground">
            Carregando destinatarios...
          </div>
        ) : filteredRecipients.length === 0 ? (
          <div className="rounded-lg border border-border/70 bg-card/75 px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhum destinatario disponivel.
          </div>
        ) : (
          <div className="grid max-h-80 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipients.map((recipient) => {
              const secondaryLabel = getRecipientSecondaryLabel(recipient);
              const isSharingCurrentRecipient = sharingRecipientId === recipient.id;
              const isShared = Boolean(recipient.alreadyShared) || isSharingCurrentRecipient;
              const isToggleDisabled =
                !entityId || Boolean(sharingRecipientId) || Boolean(revokingShareId);
              const cardClassName = cn(
                'min-h-[74px] rounded-2xl border px-3 py-2.5 transition-[border-color,background-color,box-shadow,transform]',
                isShared
                  ? 'border-emerald-500/20 bg-emerald-500/5 shadow-[0_12px_28px_rgba(16,185,129,0.08)]'
                  : 'border-border/70 bg-white/85 shadow-[0_8px_22px_rgba(15,22,26,0.06)] hover:border-primary/20 hover:bg-white dark:bg-card/85',
              );

              return (
                <div key={recipient.id} className={cardClassName}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar
                      name={recipient.name}
                      avatarUrl={recipient.avatarUrl}
                      size="sm"
                      className={cn(
                        'shrink-0 border-white/60 bg-white/80 shadow-[0_8px_18px_rgba(15,22,26,0.08)] dark:border-white/10 dark:bg-card',
                        isShared ? 'ring-2 ring-emerald-500/15' : undefined,
                      )}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{recipient.name}</p>
                      {secondaryLabel ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{secondaryLabel}</p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isShared}
                      aria-label={isShared ? `Descompartilhar ${recipient.name}` : `Compartilhar ${recipient.name}`}
                      className={cn(
                        'fac-toggle shrink-0',
                        isToggleDisabled ? 'cursor-not-allowed opacity-60' : '',
                      )}
                      data-state={isShared ? 'on' : 'off'}
                      onClick={() => {
                        if (isToggleDisabled) return;
                        if (recipient.alreadyShared) {
                          void revokeShare(recipient);
                          return;
                        }
                        void shareRecipient(recipient);
                      }}
                      disabled={isToggleDisabled}
                    >
                      <span className="fac-toggle-dot" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </AdminModal>
  );
}
