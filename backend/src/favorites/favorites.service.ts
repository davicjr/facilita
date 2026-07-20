import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import type { PermissionFlags } from '../permissions/permissions.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

type FavoriteEntityType = 'LINK' | 'SCHEDULE' | 'NOTE';
type FavoritesActor = {
  id: string;
  permissions?: PermissionFlags | null;
};

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  private assertEntityTypeSupported(
    entityType: EntityType,
  ): asserts entityType is FavoriteEntityType {
    if (
      entityType !== EntityType.LINK &&
      entityType !== EntityType.SCHEDULE &&
      entityType !== EntityType.NOTE
    ) {
      throw new BadRequestException('Tipo de entidade não suportado para favoritos');
    }
  }

  private canUseEntityType(actor: FavoritesActor, entityType: FavoriteEntityType) {
    if (entityType === EntityType.LINK) {
      return actor.permissions?.canViewLinks === true;
    }

    if (entityType === EntityType.SCHEDULE) {
      return actor.permissions?.canViewSchedules === true;
    }

    if (entityType === EntityType.NOTE) {
      return actor.permissions?.canViewNotes === true;
    }

    return false;
  }

  private filterVisibleFavorites<
    T extends {
      entityType: EntityType;
      link?: unknown | null;
      schedule?: unknown | null;
      note?: unknown | null;
    },
  >(actor: FavoritesActor, favorites: T[]) {
    return favorites.filter((favorite) => {
      if (
        favorite.entityType === EntityType.LINK &&
        this.canUseEntityType(actor, EntityType.LINK)
      ) {
        return Boolean(favorite.link);
      }

      if (
        favorite.entityType === EntityType.SCHEDULE &&
        this.canUseEntityType(actor, EntityType.SCHEDULE)
      ) {
        return Boolean(favorite.schedule);
      }

      if (
        favorite.entityType === EntityType.NOTE &&
        this.canUseEntityType(actor, EntityType.NOTE)
      ) {
        return Boolean(favorite.note);
      }

      return false;
    });
  }

  private async canAccessEntity(
    userId: string,
    entityType: FavoriteEntityType,
    entityId: string,
  ) {
    if (entityType === EntityType.LINK) {
      const link = await this.prisma.link.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, deletedAt: true },
      });
      if (!link || link.deletedAt) return false;

      if (link.ownerId === userId) return true;

      const shared = await this.prisma.share.findFirst({
        where: {
          recipientId: userId,
          linkId: entityId,
          revokedAt: null,
          removedAt: null,
        },
      });

      return Boolean(shared);
    }

    if (entityType === EntityType.SCHEDULE) {
      const schedule = await this.prisma.uploadedSchedule.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, deletedAt: true },
      });
      if (!schedule || schedule.deletedAt) return false;

      if (schedule.ownerId === userId) return true;

      const shared = await this.prisma.share.findFirst({
        where: {
          recipientId: userId,
          scheduleId: entityId,
          revokedAt: null,
          removedAt: null,
        },
      });

      return Boolean(shared);
    }

    if (entityType === EntityType.NOTE) {
      const note = await this.prisma.note.findUnique({
        where: { id: entityId },
        select: { id: true, ownerId: true, deletedAt: true },
      });
      if (!note || note.deletedAt) return false;

      if (note.ownerId === userId) return true;

      const shared = await this.prisma.share.findFirst({
        where: {
          recipientId: userId,
          noteId: entityId,
          revokedAt: null,
          removedAt: null,
        },
      });

      return Boolean(shared);
    }

    return false;
  }

  async create(actor: FavoritesActor, dto: CreateFavoriteDto) {
    this.assertEntityTypeSupported(dto.entityType);

    const idsProvided = [dto.linkId, dto.scheduleId, dto.noteId].filter(Boolean).length;
    if (idsProvided !== 1) {
      throw new BadRequestException(
        'Forneça exatamente um ID (linkId, scheduleId ou noteId)',
      );
    }

    if (dto.entityType === EntityType.LINK && !dto.linkId) {
      throw new BadRequestException('linkId é obrigatório quando entityType = LINK');
    }

    if (dto.entityType === EntityType.SCHEDULE && !dto.scheduleId) {
      throw new BadRequestException('scheduleId é obrigatório quando entityType = SCHEDULE');
    }

    if (dto.entityType === EntityType.NOTE && !dto.noteId) {
      throw new BadRequestException('noteId é obrigatório quando entityType = NOTE');
    }

    const entityId = dto.linkId || dto.scheduleId || dto.noteId;
    if (!entityId) {
      throw new BadRequestException('ID da entidade é obrigatório');
    }

    if (!this.canUseEntityType(actor, dto.entityType)) {
      throw new ForbiddenException('Permission denied for this content type');
    }

    const canAccess = await this.canAccessEntity(actor.id, dto.entityType, entityId);
    if (!canAccess) {
      throw new NotFoundException('Conteúdo não encontrado ou sem acesso');
    }

    const existingFavorite = await this.prisma.favorite.findFirst({
      where: {
        userId: actor.id,
        entityType: dto.entityType,
        linkId: dto.linkId ?? null,
        scheduleId: dto.scheduleId ?? null,
        noteId: dto.noteId ?? null,
      },
    });

    if (existingFavorite) {
      throw new ConflictException('Este item já está nos favoritos');
    }

    return this.prisma.favorite.create({
      data: {
        userId: actor.id,
        entityType: dto.entityType,
        linkId: dto.linkId,
        scheduleId: dto.scheduleId,
        noteId: dto.noteId,
      },
      include: {
        link: {
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        schedule: {
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        note: {
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllByUser(actor: FavoritesActor) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: actor.id },
      include: {
        link: {
          where: { deletedAt: null },
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        schedule: {
          where: { deletedAt: null },
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        note: {
          where: { deletedAt: null },
          include: {
            category: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.filterVisibleFavorites(actor, favorites);
  }

  async findByUserAndType(actor: FavoritesActor, entityType: EntityType) {
    this.assertEntityTypeSupported(entityType);

    if (!this.canUseEntityType(actor, entityType)) {
      return [];
    }

    const favorites = await this.prisma.favorite.findMany({
      where: { userId: actor.id, entityType },
      include: {
        link: {
          where: { deletedAt: null },
          include: { category: true, owner: true },
        },
        schedule: {
          where: { deletedAt: null },
          include: { category: true, owner: true },
        },
        note: {
          where: { deletedAt: null },
          include: { category: true, owner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.filterVisibleFavorites(actor, favorites);
  }

  async isFavorited(
    actor: FavoritesActor,
    entityType: EntityType,
    entityId: string,
  ): Promise<boolean> {
    this.assertEntityTypeSupported(entityType);

    if (!this.canUseEntityType(actor, entityType)) {
      return false;
    }

    const where: Prisma.FavoriteWhereInput = {
      userId: actor.id,
      entityType,
    };

    if (entityType === EntityType.LINK) {
      where.linkId = entityId;
    } else if (entityType === EntityType.SCHEDULE) {
      where.scheduleId = entityId;
    } else if (entityType === EntityType.NOTE) {
      where.noteId = entityId;
    }

    const favorite = await this.prisma.favorite.findFirst({ where });
    return !!favorite;
  }

  async remove(id: string, userId: string) {
    const favorite = await this.prisma.favorite.findUnique({ where: { id } });

    if (!favorite) {
      throw new NotFoundException('Favorito não encontrado');
    }

    if (favorite.userId !== userId) {
      throw new BadRequestException('Você não pode remover favoritos de outros usuários');
    }

    await this.prisma.favorite.delete({ where: { id } });

    return { message: 'Favorito removido com sucesso' };
  }

  async removeByEntity(userId: string, entityType: EntityType, entityId: string) {
    this.assertEntityTypeSupported(entityType);

    const where: Prisma.FavoriteWhereInput = { userId, entityType };

    if (entityType === EntityType.LINK) {
      where.linkId = entityId;
    } else if (entityType === EntityType.SCHEDULE) {
      where.scheduleId = entityId;
    } else if (entityType === EntityType.NOTE) {
      where.noteId = entityId;
    }

    const favorite = await this.prisma.favorite.findFirst({ where });

    if (!favorite) {
      throw new NotFoundException('Favorito não encontrado');
    }

    await this.prisma.favorite.delete({ where: { id: favorite.id } });

    return { message: 'Favorito removido com sucesso' };
  }

  async countByUser(actor: FavoritesActor): Promise<number> {
    const favorites = await this.findAllByUser(actor);
    return favorites.length;
  }

  async countByEntity(entityType: EntityType, entityId: string): Promise<number> {
    this.assertEntityTypeSupported(entityType);

    const where: Prisma.FavoriteWhereInput = { entityType };

    if (entityType === EntityType.LINK) {
      where.linkId = entityId;
    } else if (entityType === EntityType.SCHEDULE) {
      where.scheduleId = entityId;
    } else if (entityType === EntityType.NOTE) {
      where.noteId = entityId;
    }

    return this.prisma.favorite.count({ where });
  }
}
