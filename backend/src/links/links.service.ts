import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { ContentHelpersService } from '../common/services/content-helpers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

type LinkActor = {
  id?: string;
  role?: UserRole;
};

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helpers: ContentHelpersService,
  ) {}

  private include = {
    category: true,
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    shares: {
      where: { revokedAt: null, removedAt: null },
      select: {
        id: true,
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    },
    _count: {
      select: {
        favorites: true,
      },
    },
  } satisfies Prisma.LinkInclude;

  async create(actor: { id: string; role: UserRole }, dto: CreateLinkDto) {
    await this.helpers.assertCategoryOwner(dto.categoryId, actor.id);

    const created = await this.prisma.link.create({
      data: {
        ownerId: actor.id,
        categoryId: dto.categoryId,
        title: dto.title,
        url: dto.url,
        description: dto.description,
        color: dto.color,
        imageUrl: dto.imageUrl,
        imagePosition: dto.imagePosition,
        imageScale: dto.imageScale,
        order: dto.order ?? 0,
        status: dto.status ?? EntityStatus.ACTIVE,
      },
      include: this.include,
    });

    return this.helpers.withShareMetadata(created);
  }

  async findAll(viewer?: { id: string; role: UserRole }, filters?: {
    categoryId?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    if (!viewer) {
      return [];
    }

    const search = filters?.search?.trim();

    const and: Prisma.LinkWhereInput[] = [{ deletedAt: null }];

    if (filters?.categoryId) {
      and.push({ categoryId: filters.categoryId });
    }

    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { url: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }

    if (viewer.role === UserRole.SUPERADMIN) {
      if (!filters?.includeInactive) {
        and.push({ status: EntityStatus.ACTIVE });
      }
    } else {
      and.push({ ownerId: viewer.id });
      if (!filters?.includeInactive) {
        and.push({ status: EntityStatus.ACTIVE });
      }
    }

    const where: Prisma.LinkWhereInput = { AND: and };

    const items = await this.prisma.link.findMany({
      where,
      include: this.include,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((item) => this.helpers.withShareMetadata(item));
  }

  async findAllPaginated(
    filters: {
      categoryId?: string;
      search?: string;
      includeInactive?: boolean;
    },
    pagination?: { skip?: number; take?: number },
  ) {
    const search = filters.search?.trim();
    const where: Prisma.LinkWhereInput = {
      deletedAt: null,
      ...(filters.includeInactive ? {} : { status: EntityStatus.ACTIVE }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { url: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { owner: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.link.findMany({
        where,
        include: this.include,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        ...(pagination?.skip !== undefined ? { skip: pagination.skip } : {}),
        ...(pagination?.take !== undefined ? { take: pagination.take } : {}),
      }),
      this.prisma.link.count({ where }),
    ]);

    return {
      items: items.map((item) => this.helpers.withShareMetadata(item)),
      total,
    };
  }

  async findOne(id: string, viewer?: LinkActor) {
    const link = await this.prisma.link.findUnique({
      where: { id },
      include: this.include,
    });

    if (!link || link.deletedAt) {
      throw new NotFoundException('Link não encontrado');
    }

    if (viewer?.role === UserRole.SUPERADMIN) {
      return this.helpers.withShareMetadata(link);
    }

    if (!viewer?.id || link.ownerId !== viewer.id) {
      throw new ForbiddenException('Link não autorizado');
    }

    return this.helpers.withShareMetadata(link);
  }

  async update(id: string, actor: { id: string; role: UserRole }, dto: UpdateLinkDto) {
    const existing = await this.prisma.link.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Link não encontrado');
    }

    this.helpers.assertCanMutate(existing, actor, 'Link não autorizado');

    const nextCategoryId = dto.categoryId === undefined ? existing.categoryId : dto.categoryId;
    await this.helpers.assertCategoryOwner(nextCategoryId, existing.ownerId);

    const updated = await this.prisma.link.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.imagePosition !== undefined ? { imagePosition: dto.imagePosition } : {}),
        ...(dto.imageScale !== undefined ? { imageScale: dto.imageScale } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: this.include,
    });

    return this.helpers.withShareMetadata(updated);
  }

  async remove(id: string, actor: { id: string; role: UserRole }) {
    const existing = await this.prisma.link.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Link não encontrado');
    }

    this.helpers.assertCanMutate(existing, actor, 'Link não autorizado');

    const removed = await this.prisma.link.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      include: this.include,
    });

    return this.helpers.withShareMetadata(removed);
  }

  async restore(id: string, actor: { id: string; role: UserRole }) {
    const existing = await this.prisma.link.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing) {
      throw new NotFoundException('Link não encontrado');
    }

    this.helpers.assertCanMutate(existing, actor, 'Link não autorizado');

    const restored = await this.prisma.link.update({
      where: { id },
      data: {
        deletedAt: null,
        status: EntityStatus.ACTIVE,
      },
      include: this.include,
    });

    return this.helpers.withShareMetadata(restored);
  }

  async setStatus(
    id: string,
    actor: { id: string; role: UserRole },
    status: EntityStatus,
  ) {
    const existing = await this.prisma.link.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Link não encontrado');
    }

    this.helpers.assertCanMutate(existing, actor, 'Link não autorizado');

    const updated = await this.prisma.link.update({
      where: { id },
      data: { status },
      include: this.include,
    });

    return this.helpers.withShareMetadata(updated);
  }
}
