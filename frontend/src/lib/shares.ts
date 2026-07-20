import type { UserPreview } from '@/types';

export function formatShareSummary(shareCount?: number) {
  const total = shareCount ?? 0;

  if (total <= 0) {
    return 'Não compartilhado';
  }

  if (total === 1) {
    return 'Compartilhado com 1 usuário';
  }

  return `Compartilhado com ${total} usuários`;
}

export function formatSharePreview(sharedWithPreview?: UserPreview[]) {
  const names = (sharedWithPreview ?? [])
    .map((user) => user.name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return null;
  }

  if (names.length === 1) {
    return `Destinatário: ${names[0]}`;
  }

  if (names.length === 2) {
    return `Destinatários: ${names[0]} e ${names[1]}`;
  }

  return `Destinatários: ${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}
