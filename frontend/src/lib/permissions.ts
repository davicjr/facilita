'use client';

import {
  FileText,
  Folder,
  HardDrive,
  Home,
  ImageIcon,
  Keyboard,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Power,
  RefreshCw,
  Settings,
  Share2,
  Shield,
  Star,
  StickyNote,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AuthUser } from '@/stores/auth-store';
import type { PermissionFlags, UserRole } from '@/types';

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
] as const satisfies ReadonlyArray<keyof PermissionFlags>;

export type PermissionKey = (typeof permissionKeys)[number];

export type AppRoute = {
  href: string;
  label: string;
  icon: LucideIcon;
  navGroup?: string;
  keywords: string[];
  subtitle?: string;
  description?: string;
  requiredPermissions?: PermissionKey[];
  allowedRoles?: UserRole[];
  disallowedRoles?: UserRole[];
};

const labelCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const normalizePermissions = (flags: PermissionFlags): PermissionFlags => {
  const normalized = { ...flags };

  if (normalized.canCreateUsers || normalized.canEditUsers || normalized.canDeleteUsers) {
    normalized.canViewUsers = true;
  }

  if (normalized.canManageCategories) {
    normalized.canViewCategories = true;
  }

  if (normalized.canManageLinks) {
    normalized.canViewLinks = true;
  }

  if (normalized.canManageSchedules) {
    normalized.canViewSchedules = true;
  }

  if (normalized.canManageNotes) {
    normalized.canViewNotes = true;
  }

  if (normalized.canManageImages) {
    normalized.canViewImages = true;
  }

  if (normalized.canManageShares) {
    normalized.canViewSharesPage = true;
  }

  return normalized;
};

const buildPermissions = (
  enabledKeys: PermissionKey[],
): PermissionFlags =>
  permissionKeys.reduce<PermissionFlags>((acc, key) => {
    acc[key] = enabledKeys.includes(key);
    return acc;
  }, {} as PermissionFlags);

const legacyRolePermissions: Record<UserRole, PermissionFlags> = {
  SUPERADMIN: buildPermissions([
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
  ]),
  USER: buildPermissions([
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

export const APP_ROUTES: AppRoute[] = [
  {
    href: '/',
    label: 'Inicio',
    icon: Home,
    navGroup: 'Navegacao',
    subtitle: 'Portal principal',
    description: 'Links, documentos e notas do portal.',
    keywords: ['home', 'portal', 'inicio', 'conteudo'],
    requiredPermissions: ['canViewHome'],
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    navGroup: 'Administracao',
    subtitle: 'Visao geral',
    description: 'Indicadores e panorama do sistema.',
    keywords: ['dashboard', 'painel', 'metricas', 'visao geral'],
    requiredPermissions: ['canViewDashboard'],
  },
  {
    href: '/favoritos',
    label: 'Favoritos',
    icon: Star,
    navGroup: 'Navegacao',
    subtitle: 'Acesso rapido',
    description: 'Itens marcados como favoritos.',
    keywords: ['favoritos', 'salvos', 'estrelas'],
    requiredPermissions: ['canViewFavorites'],
  },
  {
    href: '/compartilhados',
    label: 'Compartilhados',
    icon: Share2,
    navGroup: 'Navegacao',
    subtitle: 'Recebidos e enviados',
    description: 'Fluxo de compartilhamento entre usuarios.',
    keywords: ['compartilhados', 'compartilhar', 'recebidos', 'enviados'],
    requiredPermissions: ['canViewSharesPage'],
    disallowedRoles: ['SUPERADMIN'],
  },
  {
    href: '/chat',
    label: 'Chat',
    icon: MessageSquare,
    navGroup: 'Navegacao',
    subtitle: 'Mensagens em tempo real',
    description: 'Converse com outros usuarios do portal.',
    keywords: ['chat', 'mensagem', 'conversa', 'dm', 'grupo'],
    requiredPermissions: [],
  },
  {
    href: '/amigos',
    label: 'Amigos',
    icon: Users,
    navGroup: 'Navegacao',
    subtitle: 'Conexoes e pedidos',
    description: 'Adicione amigos para conversar e compartilhar.',
    keywords: ['amigos', 'amizade', 'conexoes', 'pedidos', 'contatos'],
    requiredPermissions: [],
    disallowedRoles: ['SUPERADMIN'],
  },
  {
    href: '/admin/categories',
    label: 'Categorias',
    icon: Folder,
    navGroup: 'Portal',
    subtitle: 'Organizacao do portal',
    description: 'Gestao de categorias e agrupamentos.',
    keywords: ['categorias', 'pastas', 'organizacao'],
    requiredPermissions: ['canViewCategories'],
  },
  {
    href: '/admin/links',
    label: 'Links',
    icon: Link2,
    navGroup: 'Portal',
    subtitle: 'Conteudo externo',
    description: 'Gestao dos links do portal.',
    keywords: ['links', 'urls', 'atalhos', 'sites'],
    requiredPermissions: ['canViewLinks'],
  },
  {
    href: '/admin/schedules',
    label: 'Documentos',
    icon: FileText,
    navGroup: 'Portal',
    subtitle: 'Arquivos do portal',
    description: 'PDFs, planilhas e outros arquivos.',
    keywords: ['documentos', 'arquivos', 'pdf', 'doc', 'planilha'],
    requiredPermissions: ['canViewSchedules'],
  },
  {
    href: '/admin/notes',
    label: 'Notas',
    icon: StickyNote,
    navGroup: 'Portal',
    subtitle: 'Conteudo textual',
    description: 'Notas internas e compartilhadas.',
    keywords: ['notas', 'anotacoes', 'texto', 'editor'],
    requiredPermissions: ['canViewNotes'],
  },
  {
    href: '/admin/images',
    label: 'Galeria',
    icon: ImageIcon,
    navGroup: 'Portal',
    subtitle: 'Biblioteca de imagens',
    description: 'Imagens e metadados do sistema.',
    keywords: ['galeria', 'imagens', 'midia', 'fotos'],
    requiredPermissions: ['canViewImages'],
  },
  {
    href: '/admin/users',
    label: 'Usuarios',
    icon: Users,
    navGroup: 'Cadastros',
    subtitle: 'Cadastros',
    description: 'Gestao de usuarios e perfis.',
    keywords: ['usuarios', 'cadastros', 'perfis', 'contas'],
    requiredPermissions: ['canViewUsers'],
  },
  {
    href: '/admin/permissions',
    label: 'Permissoes',
    icon: Shield,
    navGroup: 'Administracao',
    subtitle: 'Controle de acesso',
    description: 'Regras e permissoes por role.',
    keywords: ['permissoes', 'acessos', 'roles', 'seguranca'],
    allowedRoles: ['SUPERADMIN'],
  },
  {
    href: '/admin/settings',
    label: 'Configuracoes',
    icon: Settings,
    navGroup: 'Administracao',
    subtitle: 'Ajustes do sistema',
    description: 'Parametros e preferencias globais.',
    keywords: ['configuracoes', 'ajustes', 'sistema', 'parametros'],
    requiredPermissions: ['canManageSystemConfig'],
  },
  {
    href: '/admin/settings/atalhos',
    label: 'Atalhos',
    icon: Keyboard,
    navGroup: 'Administracao',
    subtitle: 'Comandos de teclado',
    description: 'Atalhos globais e personalizados de navegacao.',
    keywords: ['atalhos', 'teclado', 'shortcuts', 'comandos'],
    requiredPermissions: ['canManageSystemConfig'],
  },
  {
    href: '/admin/settings/backups-automaticos',
    label: 'Backups automaticos',
    icon: HardDrive,
    navGroup: 'Administracao',
    subtitle: 'Historico do agendamento',
    description: 'Arquivos gerados pelo backup automatico e exportacao sob demanda.',
    keywords: ['backup', 'automatico', 'agendamento', 'arquivos'],
    requiredPermissions: ['canManageSystemConfig'],
  },
  {
    href: '/admin/backup',
    label: 'Backup',
    icon: HardDrive,
    navGroup: 'Administracao',
    subtitle: 'Seguranca dos dados',
    description: 'Exportacao e backups do sistema.',
    keywords: ['backup', 'exportacao', 'copia'],
    requiredPermissions: ['canBackupSystem'],
  },
  {
    href: '/admin/restore',
    label: 'Restauracao',
    icon: RefreshCw,
    navGroup: 'Administracao',
    subtitle: 'Recuperacao',
    description: 'Restauracao de backups do sistema.',
    keywords: ['restauracao', 'restaurar', 'recuperacao'],
    requiredPermissions: ['canBackupSystem'],
  },
  {
    href: '/admin/reset',
    label: 'Reset',
    icon: Power,
    navGroup: 'Administracao',
    subtitle: 'Limpeza controlada',
    description: 'Rotinas de reset do ambiente.',
    keywords: ['reset', 'limpeza', 'reiniciar'],
    requiredPermissions: ['canResetSystem'],
  },
];

const appRoutesBySpecificity = [...APP_ROUTES].sort((left, right) => {
  if (left.href === '/') return 1;
  if (right.href === '/') return -1;
  return right.href.length - left.href.length;
});

export function resolveUserPermissions(user?: AuthUser | null): PermissionFlags {
  if (!user) {
    return normalizePermissions(buildPermissions([]));
  }

  const fallback = normalizePermissions(legacyRolePermissions[user.role]);
  const permissions = user.permissions ?? null;

  if (!permissions) {
    return fallback;
  }

  const resolved = permissionKeys.reduce<PermissionFlags>((acc, key) => {
    acc[key] = permissions[key] ?? fallback[key];
    return acc;
  }, {} as PermissionFlags);

  return normalizePermissions(resolved);
}

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: PermissionKey,
) {
  return resolveUserPermissions(user)[permission];
}

export function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: PermissionKey[],
) {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function canAccessRoute(
  user: AuthUser | null | undefined,
  route: Pick<AppRoute, 'requiredPermissions' | 'allowedRoles' | 'disallowedRoles'>,
) {
  if (!user) {
    return false;
  }

  if (route.allowedRoles && !route.allowedRoles.includes(user.role)) {
    return false;
  }

  if (route.disallowedRoles?.includes(user.role)) {
    return false;
  }

  if (!route.requiredPermissions || route.requiredPermissions.length === 0) {
    return true;
  }

  return hasAllPermissions(user, route.requiredPermissions);
}

export function getAccessibleAppRoutes(user: AuthUser | null | undefined) {
  if (!user) {
    return [];
  }

  return APP_ROUTES.filter((route) => canAccessRoute(user, route));
}

const navGroupOrder = ['Navegacao', 'Portal', 'Cadastros', 'Administracao'];

const navGroupSortIndex = (label: string) => {
  const index = navGroupOrder.indexOf(label);
  return index === -1 ? navGroupOrder.length : index;
};

export function getAccessibleNavGroups(user: AuthUser | null | undefined) {
  const groups = new Map<string, AppRoute[]>();

  getAccessibleAppRoutes(user)
    .filter((route) => Boolean(route.navGroup))
    .forEach((route) => {
      const groupKey = route.navGroup as string;
      const current = groups.get(groupKey) ?? [];
      current.push(route);
      groups.set(groupKey, current);
    });

  return Array.from(groups.entries())
    .map(([label, items]) => ({
      label,
      items: [...items].sort((left, right) => {
        if (label === 'Navegacao') {
          if (left.label === 'Inicio') return -1;
          if (right.label === 'Inicio') return 1;
        }

        return labelCollator.compare(left.label, right.label);
      }),
    }))
    .sort((left, right) => navGroupSortIndex(left.label) - navGroupSortIndex(right.label));
}

function matchesPath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findRouteByPath(pathname: string) {
  return appRoutesBySpecificity.find((route) => matchesPath(pathname, route.href)) ?? null;
}

export function canAccessPath(
  user: AuthUser | null | undefined,
  pathname: string,
) {
  const route = findRouteByPath(pathname);

  if (!route) {
    if (pathname.startsWith('/admin')) {
      return false;
    }

    return Boolean(user);
  }

  return canAccessRoute(user, route);
}

export function getFallbackPath(user: AuthUser | null | undefined) {
  return getAccessibleAppRoutes(user)[0]?.href ?? null;
}
