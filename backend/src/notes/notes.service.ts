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
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
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
  } satisfies Prisma.NoteInclude;

  async create(actor: { id: string; role: UserRole }, dto: CreateNoteDto) {
    await this.helpers.assertCategoryOwner(dto.categoryId, actor.id);

    const created = await this.prisma.note.create({
      data: {
        ownerId: actor.id,
        categoryId: dto.categoryId,
        title: dto.title,
        content: dto.content,
        color: dto.color,
        imageUrl: dto.imageUrl,
        imagePosition: dto.imagePosition,
        imageScale: dto.imageScale,
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

    const and: Prisma.NoteWhereInput[] = [{ deletedAt: null }];

    if (filters?.categoryId) {
      and.push({ categoryId: filters.categoryId });
    }

    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { owner: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
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

    const where: Prisma.NoteWhereInput = { AND: and };

    const items = await this.prisma.note.findMany({
      where,
      include: this.include,
      orderBy: { createdAt: 'desc' },
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
    const where: Prisma.NoteWhereInput = {
      deletedAt: null,
      ...(filters.includeInactive ? {} : { status: EntityStatus.ACTIVE }),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { owner: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        include: this.include,
        orderBy: { createdAt: 'desc' },
        ...(pagination?.skip !== undefined ? { skip: pagination.skip } : {}),
        ...(pagination?.take !== undefined ? { take: pagination.take } : {}),
      }),
      this.prisma.note.count({ where }),
    ]);

    return {
      items: items.map((item) => this.helpers.withShareMetadata(item)),
      total,
    };
  }

  async findOne(id: string, viewer?: { id?: string; role?: UserRole }) {
    const item = await this.prisma.note.findUnique({
      where: { id },
      include: this.include,
    });

    if (!item || item.deletedAt) {
      throw new NotFoundException('Nota não encontrada');
    }

    if (viewer?.role === UserRole.SUPERADMIN) {
      return this.helpers.withShareMetadata(item);
    }

    if (!viewer?.id || item.ownerId !== viewer.id) {
      throw new ForbiddenException('Nota não autorizada');
    }

    return this.helpers.withShareMetadata(item);
  }

  async update(id: string, actor: { id: string; role: UserRole }, dto: UpdateNoteDto) {
    const existing = await this.prisma.note.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Nota não encontrada');
    }

    this.helpers.assertCanMutate(existing, actor, 'Nota não autorizada');

    const nextCategoryId = dto.categoryId === undefined ? existing.categoryId : dto.categoryId;
    await this.helpers.assertCategoryOwner(nextCategoryId, existing.ownerId);

    const updated = await this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.imagePosition !== undefined ? { imagePosition: dto.imagePosition } : {}),
        ...(dto.imageScale !== undefined ? { imageScale: dto.imageScale } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      include: this.include,
    });

    return this.helpers.withShareMetadata(updated);
  }

  async remove(id: string, actor: { id: string; role: UserRole }) {
    const existing = await this.prisma.note.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Nota não encontrada');
    }

    this.helpers.assertCanMutate(existing, actor, 'Nota não autorizada');

    const removed = await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.include,
    });

    return this.helpers.withShareMetadata(removed);
  }

  async restore(id: string, actor: { id: string; role: UserRole }) {
    const existing = await this.prisma.note.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing) {
      throw new NotFoundException('Nota não encontrada');
    }

    this.helpers.assertCanMutate(existing, actor, 'Nota não autorizada');

    const restored = await this.prisma.note.update({
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
    const existing = await this.prisma.note.findUnique({
      where: { id },
      include: this.include,
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Nota não encontrada');
    }

    this.helpers.assertCanMutate(existing, actor, 'Nota não autorizada');

    const updated = await this.prisma.note.update({
      where: { id },
      data: { status },
      include: this.include,
    });

    return this.helpers.withShareMetadata(updated);
  }
}
