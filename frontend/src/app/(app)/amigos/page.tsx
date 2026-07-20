'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, UserMinus, UserPlus, X } from 'lucide-react';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import type { Friend, FriendRequest, FriendUser } from '@/types';

type Tab = 'friends' | 'received' | 'sent' | 'discover';

const TABS: { id: Tab; label: string }[] = [
  { id: 'friends', label: 'Meus amigos' },
  { id: 'received', label: 'Pedidos recebidos' },
  { id: 'sent', label: 'Pedidos enviados' },
  { id: 'discover', label: 'Encontrar pessoas' },
];

function Avatar({ user }: { user: FriendUser }) {
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-primary/10 text-[13px] font-semibold text-primary">
      {initials || '?'}
    </div>
  );
}

function PersonRow({
  user,
  subtitle,
  actions,
}: {
  user: FriendUser;
  subtitle?: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[13px] border border-border/60 bg-background/60 px-4 py-3">
      <Avatar user={user} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">{user.name}</p>
        <p className="truncate text-[12px] text-muted-foreground">{subtitle ?? user.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant = 'neutral',
  icon: Icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'neutral';
  icon: typeof Check;
  label: string;
}) {
  const styles = {
    primary: 'border-primary/60 bg-primary text-primary-foreground hover:opacity-90',
    danger: 'border-border/70 bg-background text-red-600 hover:bg-red-50',
    neutral: 'border-border/70 bg-background text-foreground hover:bg-muted/60',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[12px] font-medium transition disabled:opacity-50 ${styles}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export default function AmigosPage() {
  const user = useAuthStore((state) => state.user);
  const pushToast = useNotificationStore((state) => state.push);
  const isSuperadmin = user?.role === 'SUPERADMIN';

  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [discovered, setDiscovered] = useState<FriendUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    if (!user || isSuperadmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, receivedRes, sentRes] = await Promise.all([
        api.get('/friends', { skipNotify: true }),
        api.get('/friends/requests/received', { skipNotify: true }),
        api.get('/friends/requests/sent', { skipNotify: true }),
      ]);
      setFriends(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      setReceived(Array.isArray(receivedRes.data) ? receivedRes.data : []);
      setSent(Array.isArray(sentRes.data) ? sentRes.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar seus amigos.'));
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, user]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  const loadDiscover = useCallback(async (term: string) => {
    try {
      const res = await api.get('/friends/discover', {
        params: term.trim() ? { search: term.trim() } : undefined,
        skipNotify: true,
      });
      setDiscovered(Array.isArray(res.data) ? res.data : []);
    } catch {
      setDiscovered([]);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'discover') return;
    const handle = window.setTimeout(() => void loadDiscover(search), 250);
    return () => window.clearTimeout(handle);
  }, [tab, search, loadDiscover]);

  const run = async (id: string, action: () => Promise<unknown>, successMsg: string) => {
    setProcessingId(id);
    try {
      await action();
      pushToast({ variant: 'success', message: successMsg });
      await loadCore();
      if (tab === 'discover') await loadDiscover(search);
    } catch (err) {
      pushToast({ variant: 'error', message: getApiErrorMessage(err, 'Não foi possível concluir a ação.') });
    } finally {
      setProcessingId(null);
    }
  };

  const sendRequest = (addresseeId: string) =>
    run(addresseeId, () => api.post('/friends/requests', { addresseeId }), 'Pedido de amizade enviado.');
  const accept = (id: string) =>
    run(id, () => api.patch(`/friends/requests/${id}/accept`), 'Pedido aceito.');
  const removeRequest = (id: string, msg: string) =>
    run(id, () => api.delete(`/friends/requests/${id}`), msg);
  const removeFriend = (friend: Friend) =>
    run(friend.friend.id, () => api.delete(`/friends/${friend.friend.id}`), 'Amizade removida.');

  const counts = useMemo(
    () => ({ friends: friends.length, received: received.length, sent: sent.length, discover: discovered.length }),
    [friends.length, received.length, sent.length, discovered.length],
  );

  if (isSuperadmin) {
    return (
      <div className="fac-page">
        <section className="fac-panel">
          <AdminPanelHeaderBar title="Amigos" count={0} />
          <div className="fac-panel-body">
            <div className="fac-empty-state">Superadmin nao participa do fluxo de amizades.</div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar title="Amigos" count={counts[tab]} />

        <div className="fac-panel-body space-y-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => {
              const badge =
                item.id === 'received' && counts.received > 0 ? ` (${counts.received})` : '';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                    tab === item.id
                      ? 'border-primary/60 bg-primary text-primary-foreground'
                      : 'border-border/70 bg-background/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {badge}
                </button>
              );
            })}
          </div>

          {tab === 'discover' ? (
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full rounded-[11px] border border-border/70 bg-background/60 px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          ) : null}

          {loading ? (
            <div className="fac-loading-state">Carregando...</div>
          ) : error ? (
            <div className="fac-error-state">{error}</div>
          ) : (
            <div className="space-y-2">
              {tab === 'friends' &&
                (friends.length === 0 ? (
                  <div className="fac-empty-state">
                    Você ainda não tem amigos. Use &quot;Encontrar pessoas&quot; para se conectar.
                  </div>
                ) : (
                  friends.map((friend) => (
                    <PersonRow
                      key={friend.friendshipId}
                      user={friend.friend}
                      actions={
                        <ActionButton
                          variant="danger"
                          icon={UserMinus}
                          label="Remover"
                          disabled={processingId === friend.friend.id}
                          onClick={() => removeFriend(friend)}
                        />
                      }
                    />
                  ))
                ))}

              {tab === 'received' &&
                (received.length === 0 ? (
                  <div className="fac-empty-state">Nenhum pedido recebido.</div>
                ) : (
                  received.map((request) => (
                    <PersonRow
                      key={request.id}
                      user={request.user}
                      subtitle={`${request.user.email} · quer se conectar`}
                      actions={
                        <>
                          <ActionButton
                            variant="primary"
                            icon={Check}
                            label="Aceitar"
                            disabled={processingId === request.id}
                            onClick={() => accept(request.id)}
                          />
                          <ActionButton
                            variant="neutral"
                            icon={X}
                            label="Recusar"
                            disabled={processingId === request.id}
                            onClick={() => removeRequest(request.id, 'Pedido recusado.')}
                          />
                        </>
                      }
                    />
                  ))
                ))}

              {tab === 'sent' &&
                (sent.length === 0 ? (
                  <div className="fac-empty-state">Nenhum pedido enviado.</div>
                ) : (
                  sent.map((request) => (
                    <PersonRow
                      key={request.id}
                      user={request.user}
                      subtitle={`${request.user.email} · aguardando resposta`}
                      actions={
                        <ActionButton
                          variant="neutral"
                          icon={X}
                          label="Cancelar"
                          disabled={processingId === request.id}
                          onClick={() => removeRequest(request.id, 'Pedido cancelado.')}
                        />
                      }
                    />
                  ))
                ))}

              {tab === 'discover' &&
                (discovered.length === 0 ? (
                  <div className="fac-empty-state">
                    {search.trim()
                      ? 'Nenhuma pessoa encontrada.'
                      : 'Nenhuma pessoa disponível para adicionar.'}
                  </div>
                ) : (
                  discovered.map((person) => (
                    <PersonRow
                      key={person.id}
                      user={person}
                      actions={
                        <ActionButton
                          variant="primary"
                          icon={UserPlus}
                          label="Adicionar"
                          disabled={processingId === person.id}
                          onClick={() => sendRequest(person.id)}
                        />
                      }
                    />
                  ))
                ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
