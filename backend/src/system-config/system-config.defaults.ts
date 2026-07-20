export type SystemConfigSeed = {
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'path' | 'time';
  isEditable: boolean;
  category: string;
};

export const INITIAL_SUPERADMIN_BOOTSTRAP_KEY = 'initial_superadmin_bootstrapped';
export const SHORTCUT_CATALOG_CONFIG_KEY = 'shortcut_catalog';

const today = new Date().toISOString().slice(0, 10);

export const SYSTEM_CONFIG_DEFAULTS: SystemConfigSeed[] = [
  {
    key: SHORTCUT_CATALOG_CONFIG_KEY,
    value: '[]',
    description: 'Catalogo de atalhos globais customizados do portal.',
    type: 'string',
    isEditable: false,
    category: 'shortcuts',
  },
  {
    key: 'backup_directory',
    value: 'backups/auto',
    description: 'Diretorio padrao para backups automaticos.',
    type: 'path',
    isEditable: true,
    category: 'backup',
  },
  {
    key: 'backup_schedule_enabled',
    value: 'false',
    description: 'Ativa o backup automatico diario.',
    type: 'boolean',
    isEditable: true,
    category: 'backup',
  },
  {
    key: 'backup_schedule_time',
    value: '02:00',
    description: 'Horario do backup automatico (HH:MM).',
    type: 'time',
    isEditable: true,
    category: 'backup',
  },
  {
    key: 'backup_retention_days',
    value: '7',
    description: 'Dias de retencao dos backups automaticos.',
    type: 'number',
    isEditable: true,
    category: 'backup',
  },
  {
    key: 'upload_directory',
    value: 'uploads',
    description: 'Diretorio base de uploads.',
    type: 'path',
    isEditable: true,
    category: 'storage',
  },
  {
    key: 'export_directory',
    value: 'exports',
    description: 'Diretorio padrao para exportacoes.',
    type: 'path',
    isEditable: true,
    category: 'storage',
  },
  {
    key: 'install_date',
    value: today,
    description: 'Data de instalacao.',
    type: 'string',
    isEditable: false,
    category: 'system',
  },
  {
    key: 'app_version',
    value: 'v2',
    description: 'Versao instalada do sistema.',
    type: 'string',
    isEditable: false,
    category: 'system',
  },
  {
    key: INITIAL_SUPERADMIN_BOOTSTRAP_KEY,
    value: 'false',
    description: 'Indica se o superadmin inicial ja foi provisionado.',
    type: 'boolean',
    isEditable: false,
    category: 'system',
  },
];
