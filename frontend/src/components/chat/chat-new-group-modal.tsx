'use client';

import { useEffect, useState } from 'react';
import AdminModal from '@/components/admin/modal';
import UserAvatar from '@/components/user-avatar';
import { useChat } from '@/hooks/useChat';
import type { User } from '@/types';

type ChatNewGroupModalProps = {
  open: boolean;
  onClose: () => void;
};

type ChatUser = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'role'>;

export default function ChatNewGroupModal({
  open,
  onClose,
}: ChatNewGroupModalProps) {
  const { createGroup, loadUsers } = useChat();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setName('');
      setSearch('');
      setSelectedIds([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const result = await loadUsers(search);
        if (active) {
          setUsers(result);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadUsers, open, search]);

  const canSubmit = name.trim().length > 0 && selectedIds.length > 0;

  return (
    <AdminModal
      open={open}
      title="Novo grupo"
      description="Defina um nome e escolha os participantes."
      onClose={onClose}
      panelClassName="max-w-[640px]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[12px] text-muted-foreground">
            {selectedIds.length} participante{selectedIds.length === 1 ? '' : 's'} selecionado
            {selectedIds.length === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={async () => {
              await createGroup(name, selectedIds);
              onClose();
            }}
            className="fac-button-primary !h-11 !px-5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Criar grupo
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do grupo"
          className="h-12 w-full rounded-[18px] border border-border/70 bg-card px-4 text-[14px] text-foreground outline-none ring-0 placeholder:text-muted-foreground"
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar participantes"
          className="h-12 w-full rounded-[18px] border border-border/70 bg-card px-4 text-[14px] text-foreground outline-none ring-0 placeholder:text-muted-foreground"
        />

        <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-[18px] border border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
              Carregando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
              Apenas amigos podem entrar no grupo. Adicione amigos na página Amigos.
            </div>
          ) : (
            users.map((user) => {
              const selected = selectedIds.includes(user.id);

              return (
                <label
                  key={user.id}
                  className={`grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border px-4 py-3 transition ${
                    selected
                      ? 'border-primary/25 bg-primary/[0.08]'
                      : 'border-border/70 bg-white/70 hover:border-primary/20 hover:bg-primary/[0.05] dark:bg-secondary/45'
                  }`}
                >
                  <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {user.name}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, user.id]
                          : current.filter((item) => item !== user.id),
                      );
                    }}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                </label>
              );
            })
          )}
        </div>
      </div>
    </AdminModal>
  );
}
