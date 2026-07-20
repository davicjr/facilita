import { UserRole } from '@prisma/client';

export const permissionKeys = [
  'canViewHome',
  'canViewDashboard',
  'canViewFavorites',
  'canViewSharesPage',
  'canViewUsers',
  'canCreateUsers',
  'canEditUsers',
  'canDeleteUsers',
  'canViewCategories',
  'canManageCategories',
  'canViewLinks',
  'canManageLinks',
  'canViewSchedules',
  'canManageSchedules',
  'canViewNotes',
  'canManageNotes',
  'canViewImages',
  'canManageImages',
  'canBackupSystem',
  'canResetSystem',
  'canManageSystemConfig',
  'canManageShares',
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export type PermissionFlags = Record<PermissionKey, boolean>;

const buildPermissionFlags = (enabledKeys: PermissionKey[]): PermissionFlags =>
  permissionKeys.reduce<PermissionFlags>((acc, key) => {
    acc[key] = enabledKeys.includes(key);
    return acc;
  }, {} as PermissionFlags);

export const defaultRolePermissions: Record<UserRole, PermissionFlags> = {
  [UserRole.SUPERADMIN]: buildPermissionFlags([
    'canViewHome',
    'canViewDashboard',
    'canViewFavorites',
    'canViewUsers',
    'canCreateUsers',
    'canEditUsers',
    'canDeleteUsers',
    'canViewCategories',
    'canManageCategories',
    'canViewLinks',
    'canManageLinks',
    'canViewSchedules',
    'canManageSchedules',
    'canViewNotes',
    'canManageNotes',
    'canViewImages',
    'canManageImages',
    'canBackupSystem',
    'canResetSystem',
    'canManageSystemConfig',
    // Admin/suporte compartilha conteúdo próprio com os usuários (não recebe).
    'canManageShares',
  ]),
  [UserRole.USER]: buildPermissionFlags([
    'canViewHome',
    'canViewFavorites',
    'canViewSharesPage',
    'canViewCategories',
    'canViewLinks',
    'canManageLinks',
    'canManageCategories',
    'canViewSchedules',
    'canManageSchedules',
    'canViewNotes',
    'canManageNotes',
    'canViewImages',
    'canManageImages',
    'canManageShares',
  ]),
};
