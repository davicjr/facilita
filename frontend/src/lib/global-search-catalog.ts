import type { AuthUser } from '@/stores/auth-store';
import { getAccessibleAppRoutes } from '@/lib/permissions';
import type { GlobalSearchResult } from '@/types/global-search';

export function getGlobalSearchPageCatalog(user?: AuthUser | null, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase() || '';

  if (!normalizedQuery) {
    return [];
  }

  return getAccessibleAppRoutes(user)
    .filter((route) => {
      const haystack = [
        route.label,
        route.subtitle,
        route.description,
        ...route.keywords,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .map<GlobalSearchResult>((route) => ({
      id: `PAGE:${route.href}`,
      entityId: route.href,
      kind: 'PAGE',
      section: 'Paginas',
      source: 'SYSTEM',
      title: route.label,
      subtitle: route.subtitle,
      description: route.description,
      href: route.href,
    }));
}
