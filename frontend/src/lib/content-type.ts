import type { EntityType } from '@/types';

export type ContentEntityType = Extract<EntityType, 'LINK' | 'SCHEDULE' | 'NOTE'>;

const CONTENT_TYPE_META: Record<
  ContentEntityType,
  {
    label: string;
    color: string;
  }
> = {
  LINK: {
    label: 'LINK',
    color: 'var(--fac-content-type-link)',
  },
  SCHEDULE: {
    label: 'DOC',
    color: 'var(--fac-content-type-schedule)',
  },
  NOTE: {
    label: 'NOTA',
    color: 'var(--fac-content-type-note)',
  },
};

export function getContentTypeLabel(type: ContentEntityType) {
  return CONTENT_TYPE_META[type].label;
}

export function getContentTypeColor(type: ContentEntityType) {
  return CONTENT_TYPE_META[type].color;
}
