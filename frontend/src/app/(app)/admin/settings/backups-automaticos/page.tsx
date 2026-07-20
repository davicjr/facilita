'use client';

import { useEffect, useState } from 'react';
import AdminPanelHeaderBar from '@/components/admin/panel-header-bar';
import api from '@/lib/api';
import { backupOptions } from '@/lib/backup';
import { getApiErrorMessage } from '@/lib/error';
import { formatBytes } from '@/lib/format';
import { notify } from '@/lib/notify';
import { hasAllPermissions } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';

type AutoBackupFile = {
  name: string;
  size: number;
  updatedAt: string;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

export default function AutoBackupsPage() {
  const user = useAuthStore((state) => state.user);
  const canManageSettings = hasAllPermissions(user, ['canManageSystemConfig']);

  const [exportingAll, setExportingAll] = useState(false);
  const [autoBackupLoading, setAutoBackupLoading] = useState(true);
  const [autoBackupFiles, setAutoBackupFiles] = useState<AutoBackupFile[]>([]);
  const [autoBackupDirectory, setAutoBackupDirectory] = useState('');
  const [autoBackupError, setAutoBackupError] = useState<string | null>(null);
  const [autoBackupDownloading, setAutoBackupDownloading] = useState('');

  const loadAutoBackups = async () => {
    setAutoBackupLoading(true);
    setAutoBackupError(null);

    try {
      const response = await api.get('/backups/auto');
      const data = response.data as {
        directory?: string;
        files?: AutoBackupFile[];
      };

      setAutoBackupDirectory(data.directory ?? '');
      setAutoBackupFiles(Array.isArray(data.files) ? data.files : []);
    } catch (err: unknown) {
      setAutoBackupError(getApiErrorMessage(err, 'Erro ao carregar backups automaticos.'));
    } finally {
      setAutoBackupLoading(false);
    }
  };

  useEffect(() => {
    if (!canManageSettings) {
      setAutoBackupLoading(false);
      return;
    }

    void loadAutoBackups();
  }, [canManageSettings]);

  const handleExportAll = async () => {
    setExportingAll(true);

    try {
      const response = await api.post(
        '/backups/export',
        { entities: backupOptions.map((option) => option.key) },
        { responseType: 'blob', skipNotify: true },
      );
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `facilita-backup-${date}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      notify.success('Backup gerado com sucesso.');
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, 'Erro ao gerar backup.'));
    } finally {
      setExportingAll(false);
    }
  };

  const handleDownloadAutoBackup = async (name: string) => {
    if (!name) {
      return;
    }

    setAutoBackupDownloading(name);

    try {
      const response = await api.get(`/backups/auto/files/${encodeURIComponent(name)}`, {
        responseType: 'blob',
        skipNotify: true,
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      notify.error(getApiErrorMessage(err, 'Erro ao baixar backup.'));
    } finally {
      setAutoBackupDownloading('');
    }
  };

  return (
    <div className="fac-page">
      <section className="fac-panel">
        <AdminPanelHeaderBar
          title="Backups automáticos"
          count={autoBackupFiles.length}
          actionsClassName="sm:grid-cols-[auto_auto]"
          actions={
            canManageSettings ? (
              <>
                <button
                  type="button"
                  className="fac-button-secondary text-[11px]"
                  onClick={loadAutoBackups}
                  disabled={autoBackupLoading}
                >
                  {autoBackupLoading ? 'Atualizando...' : 'Atualizar lista'}
                </button>
                <button
                  type="button"
                  className="fac-button-primary text-[11px]"
                  onClick={handleExportAll}
                  disabled={exportingAll}
                >
                  {exportingAll ? 'Gerando...' : 'Backup total agora'}
                </button>
              </>
            ) : undefined
          }
        />

        <div className="fac-panel-body space-y-4">
          {!canManageSettings ? (
            <div className="fac-error-state">Acesso restrito.</div>
          ) : (
            <>
              {autoBackupDirectory ? (
                <div className="rounded-[16px] border border-border/70 bg-card/80 px-4 py-3 text-[12px] text-muted-foreground">
                  Diretorio: <span className="text-foreground">{autoBackupDirectory}</span>
                </div>
              ) : null}

              {autoBackupLoading ? (
                <div className="fac-loading-state">Carregando backups automaticos...</div>
              ) : autoBackupError ? (
                <div className="fac-error-state">{autoBackupError}</div>
              ) : autoBackupFiles.length === 0 ? (
                <div className="fac-empty-state">Nenhum backup automatico encontrado.</div>
              ) : (
                <div className="space-y-2">
                  {autoBackupFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border/70 bg-card/80 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-foreground">{file.name}</p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {formatBytes(file.size, 1)} · {formatDate(file.updatedAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="fac-button-secondary !h-9 !px-4 text-[10px]"
                        onClick={() => handleDownloadAutoBackup(file.name)}
                        disabled={autoBackupDownloading === file.name}
                      >
                        {autoBackupDownloading === file.name ? 'Baixando...' : 'Baixar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
