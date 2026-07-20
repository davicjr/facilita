import { Injectable } from '@nestjs/common';
import {
  EntityStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { PermissionFlags } from '../permissions/permissions.constants';

type SearchActor = {
  id: string;
  role: UserRole;
  permissions?: PermissionFlags;
};

type SearchKind =
  | 'LINK'
  | 'SCHEDULE'
  | 'NOTE'
  | 'CATEGORY'
  | 'IMAGE'
  | 'USER';

type SearchSection =
  | 'Conteudo'
  | 'Categorias'
  | 'Midia'
  | 'Cadastros';

type SearchSource =
  | 'OWNED'
  | 'SHARED'
  | 'ADMIN';

type SearchResult = {
  id: string;
  entityId: string;
  kind: SearchKind;
  section: SearchSection;
  source: SearchSource;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  status?: EntityStatus;
  category?: {
    name?: string | null;
    color?: string | null;
    icon?: string | null;
  } | null;
  imageUrl?: string | null;
  externalUrl?: string;
  fileUrl?: string;
  fileName?: string;
  noteContent?: string;
};

const DEFAULT_LIMIT = 18;
const MAX_LIMIT = 50;
const SOURCE_PRIORITY: Record<SearchSource, number> = {
  OWNED: 0,
  ADMIN: 1,
  SHARED: 2,
};
const SECTION_PRIORITY: Record<SearchSection, number> = {
  Conteudo: 0,
  Categorias: 1,
  Midia: 2,
  Cadastros: 3,
};

const stripHtml = (value?: string | null) =>
  (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (value: string, maxLength = 180) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  private hasPermission(actor: SearchActor, permission: keyof PermissionFlags) {
    return actor.permissions?.[permission] === true;
  }

  /**
   * Skeleton shared by every search source: gate by permission, fetch, score-sort, map.
   * The Prisma query itself (where/include, genuinely different per model) stays with the caller.
   */
  private async runSearch<TItem>(
    actor: SearchActor,
    permission: keyof PermissionFlags,
    fetch: () => Promise<TItem[]>,
    score: (item: TItem) => number,
    mapToResult: (item: TItem) => SearchResult,
  ): Promise<SearchResult[]> {
    if (!this.hasPermission(actor, permission)) {
      return [];
    }

    const items = await fetch();

    return items
      .sort((left, right) => score(left) - score(right))
      .map(mapToResult);
  }

  async searchGlobal(
    actor: SearchActor,
    options: { q?: string; limit?: number },
  ) {
    const query = options.q?.trim();
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    if (!query) {
      return {
        query: '',
        items: [],
      };
    }

    const perSourceLimit = Math.max(6, Math.min(limit, 12));

    const [
      categories,
      images,
      users,
      links,
      sharedLinks,
      schedules,
      sharedSchedules,
      notes,
      sharedNotes,
    ] = await Promise.all([
      this.searchCategories(actor, query, perSourceLimit),
      this.searchImages(actor, query, perSourceLimit),
      this.searchUsers(actor, query, perSourceLimit),
      this.searchLinks(actor, query, perSourceLimit),
      actor.role === UserRole.SUPERADMIN
        ? Promise.resolve<SearchResult[]>([])
        : this.searchSharedLinks(actor, query, perSourceLimit),
      this.searchSchedules(actor, query, perSourceLimit),
      actor.role === UserRole.SUPERADMIN
        ? Promise.resolve<SearchResult[]>([])
        : this.searchSharedSchedules(actor, query, perSourceLimit),
      this.searchNotes(actor, query, perSourceLimit),
      actor.role === UserRole.SUPERADMIN
        ? Promise.resolve<SearchResult[]>([])
        : this.searchSharedNotes(actor, query, perSourceLimit),
    ]);

    const deduped = new Map<string, SearchResult>();

    [
      ...links,
      ...sharedLinks,
      ...schedules,
      ...sharedSchedules,
      ...notes,
      ...sharedNotes,
      ...categories,
      ...images,
      ...users,
    ].forEach((item) => {
      const key = `${item.kind}:${item.entityId}`;
      const current = deduped.get(key);

      if (!current) {
        deduped.set(key, item);
        return;
      }

      if (SOURCE_PRIORITY[item.source] < SOURCE_PRIORITY[current.source]) {
        deduped.set(key, item);
      }
    });

    const items = Array.from(deduped.values())
      .sort((left, right) => {
        const sectionDiff = SECTION_PRIORITY[left.section] - SECTION_PRIORITY[right.section];
        if (sectionDiff !== 0) {
          return sectionDiff;
        }

        const sourceDiff = SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source];
        if (sourceDiff !== 0) {
          return sourceDiff;
        }

        return left.title.localeCompare(right.title, 'pt-BR');
      })
      .slice(0, limit);

    return {
      query,
      items,
    };
  }

  private buildTextScore(title: string, query: string, extra?: string) {
    const normalizedTitle = title.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const normalizedExtra = (extra ?? '').toLowerCase();

    if (normalizedTitle === normalizedQuery) {
      return 0;
    }

    if (normalizedTitle.startsWith(normalizedQuery)) {
      return 1;
    }

    if (normalizedTitle.includes(normalizedQuery)) {
      return 2;
    }

    if (normalizedExtra.startsWith(normalizedQuery)) {
      return 3;
    }

    if (normalizedExtra.includes(normalizedQuery)) {
      return 4;
    }

    return 5;
  }

  private async searchCategories(actor: SearchActor, query: string, take: number) {
    return this.runSearch(
      actor,
      'canViewCategories',
      () =>
        this.prisma.category.findMany({
          where: {
            ...(actor.role === UserRole.SUPERADMIN ? {} : { ownerId: actor.id }),
            OR: [
              { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { owner: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
            ],
          },
          include: {
            owner: { select: { id: true, name: true } },
            _count: { select: { links: true, schedules: true, notes: true } },
          },
          take,
        }),
      (category) => this.buildTextScore(category.name, query, category.owner?.name),
      (category) => ({
        id: `CATEGORY:${category.id}`,
        entityId: category.id,
        kind: 'CATEGORY',
        section: 'Categorias',
        source: actor.role === UserRole.SUPERADMIN ? 'ADMIN' : 'OWNED',
        title: category.name,
        subtitle:
          actor.role === UserRole.SUPERADMIN && category.owner?.name
            ? `Categoria de ${category.owner.name}`
            : 'Categoria do portal',
        description: `${category._count.links} links, ${category._count.schedules} documentos e ${category._count.notes} notas`,
        href: '/admin/categories',
        status: category.status,
        category: {
          name: category.name,
          color: category.color,
          icon: category.icon,
        },
      }),
    );
  }

  private async searchImages(actor: SearchActor, query: string, take: number) {
    const tags = query
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    return this.runSearch(
      actor,
      'canViewImages',
      () =>
        this.prisma.uploadedImage.findMany({
          where: {
            deletedAt: null,
            ...(actor.role === UserRole.SUPERADMIN ? {} : { uploadedBy: actor.id }),
            OR: [
              { originalName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { filename: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { alt: { contains: query, mode: Prisma.QueryMode.insensitive } },
              ...(tags.length > 0 ? [{ tags: { hasSome: tags } }] : []),
            ],
          },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        }),
      (image) => this.buildTextScore(image.originalName, query, `${image.alt ?? ''} ${image.tags.join(' ')}`),
      (image) => ({
        id: `IMAGE:${image.id}`,
        entityId: image.id,
        kind: 'IMAGE',
        section: 'Midia',
        source: actor.role === UserRole.SUPERADMIN ? 'ADMIN' : 'OWNED',
        title: image.originalName,
        subtitle:
          actor.role === UserRole.SUPERADMIN && image.user?.name
            ? `Imagem enviada por ${image.user.name}`
            : 'Imagem da galeria',
        description:
          image.alt || (image.tags.length > 0 ? `Tags: ${image.tags.join(', ')}` : undefined),
        href: '/admin/images',
        status: image.status,
        imageUrl: image.url,
      }),
    );
  }

  private async searchUsers(actor: SearchActor, query: string, take: number) {
    if (!this.hasPermission(actor, 'canViewUsers')) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
      orderBy: { name: 'asc' },
      take,
    });

    return users.map<SearchResult>((user) => ({
      id: `USER:${user.id}`,
      entityId: user.id,
      kind: 'USER',
      section: 'Cadastros',
      source: 'ADMIN',
      title: user.name,
      subtitle: user.email,
      description: user.role === UserRole.SUPERADMIN ? 'Superadmin' : 'Usuario',
      href: '/admin/users',
      status: user.status === 'ACTIVE' ? EntityStatus.ACTIVE : EntityStatus.INACTIVE,
    }));
  }

  private buildOwnedWhere(
    actor: SearchActor,
    search: Prisma.LinkWhereInput | Prisma.NoteWhereInput | Prisma.UploadedScheduleWhereInput,
  ) {
    if (actor.role === UserRole.SUPERADMIN) {
      return {
        deletedAt: null,
        ...search,
      };
    }

    return {
      deletedAt: null,
      ownerId: actor.id,
      AND: [search],
    };
  }

  private async searchLinks(actor: SearchActor, query: string, take: number) {
    return this.runSearch(
      actor,
      'canViewLinks',
      () =>
        this.prisma.link.findMany({
          where: this.buildOwnedWhere(actor, {
            OR: [
              { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { url: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
              { owner: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
            ],
          }) as Prisma.LinkWhereInput,
          include: {
            category: true,
            owner: { select: { id: true, name: true, role: true } },
          },
          take,
        }),
      (item) => this.buildTextScore(item.title, query, `${item.description ?? ''} ${item.url}`),
      (item) => ({
        id: `LINK:${item.id}`,
        entityId: item.id,
        kind: 'LINK',
        section: 'Conteudo',
        source: actor.role === UserRole.SUPERADMIN ? 'ADMIN' : 'OWNED',
        title: item.title,
        subtitle: item.category?.name || 'Link',
        description: item.description || item.url,
        href:
          actor.role === UserRole.SUPERADMIN || item.ownerId === actor.id
            ? '/admin/links'
            : '/',
        status: item.status,
        category: item.category
          ? { name: item.category.name, color: item.category.color, icon: item.category.icon }
          : null,
        imageUrl: item.imageUrl,
        externalUrl: item.url,
      }),
    );
  }

  private async searchSharedLinks(actor: SearchActor, query: string, take: number) {
    if (!this.hasPermission(actor, 'canViewLinks')) {
      return [];
    }

    return this.runSearch(
      actor,
      'canViewSharesPage',
      async () => {
        const shares = await this.prisma.share.findMany({
          where: {
            recipientId: actor.id,
            revokedAt: null,
            removedAt: null,
            link: {
              is: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { url: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
                ],
              },
            },
          },
          include: {
            owner: { select: { id: true, name: true } },
            link: {
              include: {
                category: true,
                owner: { select: { id: true, name: true, role: true } },
              },
            },
          },
          take,
        });

        return shares.filter(
          (share): share is typeof share & { link: NonNullable<typeof share.link> } =>
            Boolean(share.link),
        );
      },
      (share) =>
        this.buildTextScore(share.link.title, query, `${share.link.description ?? ''} ${share.link.url}`),
      (share) => ({
        id: `LINK:${share.link.id}`,
        entityId: share.link.id,
        kind: 'LINK',
        section: 'Conteudo',
        source: 'SHARED',
        title: share.link.title,
        subtitle: share.link.category?.name || 'Link compartilhado',
        description: share.link.description || `Compartilhado por ${share.owner.name}`,
        href: '/compartilhados',
        status: share.link.status,
        category: share.link.category
          ? {
              name: share.link.category.name,
              color: share.link.category.color,
              icon: share.link.category.icon,
            }
          : null,
        imageUrl: share.link.imageUrl,
        externalUrl: share.link.url,
      }),
    );
  }

  private async searchSchedules(actor: SearchActor, query: string, take: number) {
    return this.runSearch(
      actor,
      'canViewSchedules',
      () =>
        this.prisma.uploadedSchedule.findMany({
          where: this.buildOwnedWhere(actor, {
            OR: [
              { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { fileName: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
              { owner: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
            ],
          }) as Prisma.UploadedScheduleWhereInput,
          include: {
            category: true,
            owner: { select: { id: true, name: true, role: true } },
          },
          take,
        }),
      (item) => this.buildTextScore(item.title, query, item.fileName),
      (item) => ({
        id: `SCHEDULE:${item.id}`,
        entityId: item.id,
        kind: 'SCHEDULE',
        section: 'Conteudo',
        source: actor.role === UserRole.SUPERADMIN ? 'ADMIN' : 'OWNED',
        title: item.title,
        subtitle: item.category?.name || 'Documento',
        description: item.fileName,
        href:
          actor.role === UserRole.SUPERADMIN || item.ownerId === actor.id
            ? '/admin/schedules'
            : '/',
        status: item.status,
        category: item.category
          ? { name: item.category.name, color: item.category.color, icon: item.category.icon }
          : null,
        imageUrl: item.imageUrl,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
      }),
    );
  }

  private async searchSharedSchedules(actor: SearchActor, query: string, take: number) {
    if (!this.hasPermission(actor, 'canViewSchedules')) {
      return [];
    }

    return this.runSearch(
      actor,
      'canViewSharesPage',
      async () => {
        const shares = await this.prisma.share.findMany({
          where: {
            recipientId: actor.id,
            revokedAt: null,
            removedAt: null,
            schedule: {
              is: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { fileName: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
                ],
              },
            },
          },
          include: {
            owner: { select: { id: true, name: true } },
            schedule: {
              include: {
                category: true,
                owner: { select: { id: true, name: true, role: true } },
              },
            },
          },
          take,
        });

        return shares.filter(
          (share): share is typeof share & { schedule: NonNullable<typeof share.schedule> } =>
            Boolean(share.schedule),
        );
      },
      (share) => this.buildTextScore(share.schedule.title, query, share.schedule.fileName),
      (share) => ({
        id: `SCHEDULE:${share.schedule.id}`,
        entityId: share.schedule.id,
        kind: 'SCHEDULE',
        section: 'Conteudo',
        source: 'SHARED',
        title: share.schedule.title,
        subtitle: share.schedule.category?.name || 'Documento compartilhado',
        description: share.schedule.fileName,
        href: '/compartilhados',
        status: share.schedule.status,
        category: share.schedule.category
          ? {
              name: share.schedule.category.name,
              color: share.schedule.category.color,
              icon: share.schedule.category.icon,
            }
          : null,
        imageUrl: share.schedule.imageUrl,
        fileUrl: share.schedule.fileUrl,
        fileName: share.schedule.fileName,
      }),
    );
  }

  private async searchNotes(actor: SearchActor, query: string, take: number) {
    return this.runSearch(
      actor,
      'canViewNotes',
      () =>
        this.prisma.note.findMany({
          where: this.buildOwnedWhere(actor, {
            OR: [
              { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { content: { contains: query, mode: Prisma.QueryMode.insensitive } },
              { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
              { owner: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
            ],
          }) as Prisma.NoteWhereInput,
          include: {
            category: true,
            owner: { select: { id: true, name: true, role: true } },
          },
          take,
        }),
      (item) => this.buildTextScore(item.title, query, stripHtml(item.content)),
      (item) => ({
        id: `NOTE:${item.id}`,
        entityId: item.id,
        kind: 'NOTE',
        section: 'Conteudo',
        source: actor.role === UserRole.SUPERADMIN ? 'ADMIN' : 'OWNED',
        title: item.title,
        subtitle: item.category?.name || 'Nota',
        description: truncate(stripHtml(item.content)),
        href:
          actor.role === UserRole.SUPERADMIN || item.ownerId === actor.id
            ? '/admin/notes'
            : '/',
        status: item.status,
        category: item.category
          ? { name: item.category.name, color: item.category.color, icon: item.category.icon }
          : null,
        imageUrl: item.imageUrl,
        noteContent: item.content,
      }),
    );
  }

  private async searchSharedNotes(actor: SearchActor, query: string, take: number) {
    if (!this.hasPermission(actor, 'canViewNotes')) {
      return [];
    }

    return this.runSearch(
      actor,
      'canViewSharesPage',
      async () => {
        const shares = await this.prisma.share.findMany({
          where: {
            recipientId: actor.id,
            revokedAt: null,
            removedAt: null,
            note: {
              is: {
                deletedAt: null,
                OR: [
                  { title: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { content: { contains: query, mode: Prisma.QueryMode.insensitive } },
                  { category: { name: { contains: query, mode: Prisma.QueryMode.insensitive } } },
                ],
              },
            },
          },
          include: {
            owner: { select: { id: true, name: true } },
            note: {
              include: {
                category: true,
                owner: { select: { id: true, name: true, role: true } },
              },
            },
          },
          take,
        });

        return shares.filter(
          (share): share is typeof share & { note: NonNullable<typeof share.note> } =>
            Boolean(share.note),
        );
      },
      (share) => this.buildTextScore(share.note.title, query, stripHtml(share.note.content)),
      (share) => ({
        id: `NOTE:${share.note.id}`,
        entityId: share.note.id,
        kind: 'NOTE',
        section: 'Conteudo',
        source: 'SHARED',
        title: share.note.title,
        subtitle: share.note.category?.name || 'Nota compartilhada',
        description: truncate(stripHtml(share.note.content)),
        href: '/compartilhados',
        status: share.note.status,
        category: share.note.category
          ? {
              name: share.note.category.name,
              color: share.note.category.color,
              icon: share.note.category.icon,
            }
          : null,
        imageUrl: share.note.imageUrl,
        noteContent: share.note.content,
      }),
    );
  }
}
