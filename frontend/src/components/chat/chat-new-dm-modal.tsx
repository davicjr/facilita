'use client';

import { useEffect, useState } from 'react';
import AdminModal from '@/components/admin/modal';
import UserAvatar from '@/components/user-avatar';
import { useChat } from '@/hooks/useChat';
import type { User } from '@/types';

type ChatNewDmModalProps = {
  open: boolean;
  onClose: () => void;
};

type ChatUser = Pick<User, 'id' | 'name' | 'email' | 'avatarUrl' | 'role'>;

export default function ChatNewDmModal({ open, onClose }: ChatNewDmModalProps) {
  const { createDM, loadUsers } = useChat();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);

  useEffect(() => {
    if (!open) {
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

  return (
    <AdminModal
      open={open}
      title="Nova conversa"
      description="Escolha um amigo para iniciar um chat direto."
      onClose={onClose}
      panelClassName="max-w-[560px]"
    >
      <div className="space-y-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou email"
          className="h-12 w-full rounded-[18px] border border-border/70 bg-card px-4 text-[14px] text-foreground outline-none ring-0 placeholder:text-muted-foreground"
        />

        <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-[18px] border border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
              Carregando usuarios...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
              {search.trim()
                ? 'Nenhum contato encontrado.'
                : 'Converse com seus amigos e com o suporte. Adicione amigos na página Amigos.'}
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={async () => {
                  await createDM(user.id);
                  onClose();
                }}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-border/70 bg-white/70 px-4 py-3 text-left transition hover:border-primary/25 hover:bg-primary/[0.05] dark:bg-secondary/45"
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
              </button>
            ))
          )}
        </div>
      </div>
    </AdminModal>
  );
}
