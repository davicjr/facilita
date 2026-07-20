'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import AdminField from '@/components/admin/field';
import AdminModal from '@/components/admin/modal';
import AvatarUpload from '@/components/admin/avatar-upload';
import { getApiErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth-store';

type UserProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function UserProfileModal({
  open,
  onClose,
}: UserProfileModalProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name || '');
    setUsername(user.email || '');
    setPassword('');
    setAvatarUrl(user.avatarUrl ?? '');
    setError(null);
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        avatarUrl: avatarUrl.trim() || null,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      const response = await api.patch('/users/me', payload);
      setUser(response.data);
      onClose();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Erro ao atualizar perfil.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminModal
      open={open}
      title="Perfil"
      description="Atualize suas informações pessoais."
      onClose={onClose}
      panelClassName="max-w-[560px]"
      footer={
        <>
          <button
            type="button"
            className="fac-button-secondary min-w-[120px] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="fac-button-primary min-w-[120px] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSave}
            disabled={loading || !name.trim() || !username.trim()}
          >
            {loading ? 'Salvando' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <section className="fac-form-card">
          <label className="fac-label">Foto de perfil</label>
          <AvatarUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            name={name || 'Usuário'}
            disabled={loading}
          />
        </section>

        <section className="fac-form-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Nome" htmlFor="profile-name">
              <input
                id="profile-name"
                className="fac-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </AdminField>

            <AdminField label="Usuário" htmlFor="profile-username">
              <input
                id="profile-username"
                type="text"
                className="fac-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
              />
            </AdminField>

            <div className="sm:col-span-2">
              <AdminField
                label="Senha nova"
                htmlFor="profile-password"
                hint="Deixe em branco para manter a senha atual."
              >
                <input
                  id="profile-password"
                  type="password"
                  className="fac-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </AdminField>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </AdminModal>
  );
}
