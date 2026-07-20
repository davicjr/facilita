import type { EntityStatus } from '@/types';

export type GlobalSearchKind =
  | 'PAGE'
  | 'LINK'
  | 'SCHEDULE'
  | 'NOTE'
  | 'CATEGORY'
  | 'IMAGE'
  | 'USER';

export type GlobalSearchSection =
  | 'Paginas'
  | 'Conteudo'
  | 'Categorias'
  | 'Midia'
  | 'Cadastros';

export type GlobalSearchSource =
  | 'SYSTEM'
  | 'OWNED'
  | 'PUBLIC'
  | 'SHARED'
  | 'ADMIN';

export type GlobalSearchCategory = {
  name?: string | null;
  color?: string | null;
  icon?: string | null;
};

export type GlobalSearchResult = {
  id: string;
  entityId: string;
  kind: GlobalSearchKind;
  section: GlobalSearchSection;
  source: GlobalSearchSource;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  status?: EntityStatus;
  category?: GlobalSearchCategory | null;
  imageUrl?: string | null;
  externalUrl?: string;
  fileUrl?: string;
  fileName?: string;
  noteContent?: string;
};

export type GlobalSearchResponse = {
  query: string;
  items: GlobalSearchResult[];
};
