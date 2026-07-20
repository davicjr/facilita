export const backupOptions = [
  { key: 'users', label: 'Usuários', hint: 'Perfis e credenciais.' },
  { key: 'rolePermissions', label: 'Permissões', hint: 'Regras por role.' },
  { key: 'categories', label: 'Categorias', hint: 'Categorias dos usuários.' },
  { key: 'links', label: 'Links', hint: 'Links criados pelos usuários.' },
  {
    key: 'uploadedSchedules',
    label: 'Documentos',
    hint: 'Documentos enviados.',
  },
  {
    key: 'notes',
    label: 'Notas',
    hint: 'Notas dos usuários.',
  },
  {
    key: 'uploadedImages',
    label: 'Imagens',
    hint: 'Arquivos de imagem enviados.',
  },
  {
    key: 'shares',
    label: 'Compartilhamentos',
    hint: 'Relações de compartilhamento entre usuários.',
  },
  {
    key: 'favorites',
    label: 'Favoritos',
    hint: 'Itens favoritos dos usuários.',
  },
  {
    key: 'notifications',
    label: 'Notificações',
    hint: 'Notificações in-app.',
  },
  {
    key: 'systemConfig',
    label: 'Configurações',
    hint: 'Configurações globais da plataforma.',
  },
] as const;

export type BackupOptionKey = (typeof backupOptions)[number]['key'];
export type BackupEntity = BackupOptionKey;
export type BackupSelection = Record<BackupOptionKey, boolean>;

export const buildInitialSelection = (value = true): BackupSelection =>
  backupOptions.reduce((acc, option) => {
    acc[option.key] = value;
    return acc;
  }, {} as BackupSelection);

export const getSelectedEntities = (
  selection: BackupSelection,
): BackupEntity[] => {
  const base = backupOptions
    .filter((option) => selection[option.key])
    .map((option) => option.key);

  return Array.from(new Set(base));
};

export const countSelectedOptions = (selection: BackupSelection) =>
  backupOptions.reduce(
    (total, option) => total + (selection[option.key] ? 1 : 0),
    0,
  );

export const areAllOptionsSelected = (selection: BackupSelection) =>
  backupOptions.every((option) => selection[option.key]);
