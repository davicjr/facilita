import type { UserRole } from '@/types';

export const userRoleLabels: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  USER: 'Usuário',
};

export function getUserRoleLabel(role: UserRole) {
  return userRoleLabels[role];
}
