import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityType, NotificationType, UserRole, UserStatus } from '@prisma/client';
import type { PermissionFlags } from '../permissions/permissions.constants';
import { ShareStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FriendsService } from '../friends/friends.service';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareLocalCategoryDto } from './dto/update-share-local-category.dto';

type ShareableEntityType =
  | 'LINK'
  | 'SCHEDULE'
  | 'NOTE';
type ShareActor = {
  id: string;
  role: UserRole;
  permissions?: PermissionFlags | null;
};

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly friendsService: FriendsService,
  ) {}

  private assertUserOnly(actor: { role: UserRole }) {
    if (actor.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException('Superadmin cannot use share flow');
    }
  }

  private assertShareableEntityType(
    entityType: EntityType,
  ): asserts entityType is ShareableEntityType {
    if (
      entityType !== EntityType.LINK &&
      entityType !== EntityType.SCHEDULE &&
      entityType !== EntityType.NOTE
    ) {
      throw new BadRequestException('Unsupported entity type for share');
    }
  }

  private canUseEntityType(actor: ShareActor, entityType: ShareableEntityType) {
    // Admin/suporte pode compartilhar qualquer tipo de conteúdo próprio.
    if (actor.role === UserRole.SUPERADMIN) {
      return true;
    }
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

  private filterVisibleShares<
    T extends {
      entityType: EntityType;
      link?: unknown | null;
      schedule?: unknown | null;
      note?: unknown | null;
    },
  >(actor: ShareActor, shares: T[]) {
    return shares.filter((share) => {
      if (
        share.entityType === EntityType.LINK &&
        this.canUseEntityType(actor, EntityType.LINK)
      ) {
        return Boolean(share.link);
      }

      if (
        share.entityType === EntityType.SCHEDULE &&
        this.canUseEntityType(actor, EntityType.SCHEDULE)
      ) {
        return Boolean(share.schedule);
      }

      if (
        share.entityType === EntityType.NOTE &&
        this.canUseEntityType(actor, EntityType.NOTE)
      ) {
        return Boolean(share.note);
      }

      return false;
    });
  }

  private buildEntityWhere(entityType: ShareableEntityType, entityId: string) {
    if (entityType === EntityType.LINK) {
      return { linkId: entityId };
    }
    if (entityType === EntityType.SCHEDULE) {
      return { scheduleId: entityId };
    }
    if (entityType === EntityType.NOTE) {
      return { noteId: entityId };
    }
    throw new BadRequestException('Unsupported entity type for share');
  }

  private async resolveEntity(entityType: ShareableEntityType, entityId: string) {
    if (entityType === EntityType.LINK) {
      const link = await this.prisma.link.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, ownerId: true },
      });
      if (!link) throw new NotFoundException('Link not found');
      return link;
    }
    if (entityType === EntityType.SCHEDULE) {
      const schedule = await this.prisma.uploadedSchedule.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, ownerId: true },
      });
      if (!schedule) throw new NotFoundException('Document not found');
      return schedule;
    }
    if (entityType === EntityType.NOTE) {
      const note = await this.prisma.note.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, ownerId: true },
      });
      if (!note) throw new NotFoundException('Note not found');
      return note;
    }
    throw new BadRequestException('Unsupported entity type for share');
  }

  private async validateRecipients(ownerId: string, recipientIds: string[]) {
    const uniqueRecipientIds = Array.from(
      new Set(recipientIds.map((id) => id.trim()).filter(Boolean)),
    );

    if (uniqueRecipientIds.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (uniqueRecipientIds.includes(ownerId)) {
      throw new BadRequestException('Cannot share with yourself');
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: uniqueRecipientIds },
      },
      select: { id: true, role: true, status: true },
    });

    if (users.length !== uniqueRecipientIds.length) {
      throw new BadRequestException('One or more recipients do not exist');
    }

    const invalid = users.find(
      (user) => user.status !== 'ACTIVE' || user.role === UserRole.SUPERADMIN,
    );
    if (invalid) {
      throw new BadRequestException(
        'Recipients must be active users and cannot be superadmin',
      );
    }

    // Só é possível compartilhar com quem se está conectado (amigos aceitos;
    // o admin/suporte é conectado a todos). Compartilhar PARA o admin é barrado
    // acima (recipients não podem ser SUPERADMIN).
    await this.friendsService.assertConnectedWithAll(ownerId, uniqueRecipientIds);

    return uniqueRecipientIds;
  }

  private includeShareRelations() {
    return {
      owner: {
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      },
      recipient: {
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      },
      localCategory: {
        select: { id: true, name: true, color: true },
      },
      link: {
        include: {
          category: true,
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      schedule: {
        include: {
          category: true,
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
      note: {
        include: {
          category: true,
          owner: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
    } as const;
  }

  async create(actor: ShareActor, dto: CreateShareDto) {
    // Admin/suporte também compartilha (não passa por assertUserOnly).
    this.assertShareableEntityType(dto.entityType);

    if (!this.canUseEntityType(actor, dto.entityType)) {
      throw new ForbiddenException('Permission denied for this content type');
    }

    // Compartilhamento do admin/suporte é oficial: entra aprovado (aparece direto).
    // Entre usuários comuns, entra pendente até o destinatário aprovar.
    const autoAccept = actor.role === UserRole.SUPERADMIN;

    const entity = await this.resolveEntity(dto.entityType, dto.entityId);
    if (entity.ownerId !== actor.id) {
      throw new ForbiddenException('You can only share your own content');
    }

    const recipientIds = await this.validateRecipients(actor.id, dto.recipientIds);
    const entityWhere = this.buildEntityWhere(dto.entityType, dto.entityId);

    // Um findMany pros N destinatários em vez de um findFirst por destinatário (N+1).
    const existingShares = await this.prisma.share.findMany({
      where: {
        ownerId: actor.id,
        recipientId: { in: recipientIds },
        entityType: dto.entityType,
        ...entityWhere,
      },
      include: this.includeShareRelations(),
    });
    const existingByRecipient = new Map(
      existingShares.map((share) => [share.recipientId, share]),
    );

    const shares = [];
    const notifiedRecipientIds: string[] = [];
    for (const recipientId of recipientIds) {
      const existing = existingByRecipient.get(recipientId);

      if (existing) {
        if (!existing.revokedAt && !existing.removedAt) {
          shares.push(existing);
          continue;
        }

        const reactivated = await this.prisma.share.update({
          where: { id: existing.id },
          data: {
            revokedAt: null,
            removedAt: null,
            localCategoryId: null,
            // Reenvio: volta a exigir aprovação (a menos que seja do admin/suporte).
            status: autoAccept ? ShareStatus.ACCEPTED : ShareStatus.PENDING,
            approvedAt: autoAccept ? new Date() : null,
          },
          include: this.includeShareRelations(),
        });
        shares.push(reactivated);
        notifiedRecipientIds.push(recipientId);
        continue;
      }

      const created = await this.prisma.share.create({
        data: {
          ownerId: actor.id,
          recipientId,
          entityType: dto.entityType,
          status: autoAccept ? ShareStatus.ACCEPTED : ShareStatus.PENDING,
          approvedAt: autoAccept ? new Date() : null,
          ...entityWhere,
        },
        include: this.includeShareRelations(),
      });

      shares.push(created);
      notifiedRecipientIds.push(recipientId);
    }

    if (notifiedRecipientIds.length > 0) {
      await this.notificationsService.createBulk(notifiedRecipientIds, {
        type: NotificationType.CONTENT_SHARED,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: 'Novo compartilhamento',
        message: `${entity.title} foi compartilhado com voce`,
        actionUrl: '/compartilhados',
        metadata: {
          ownerId: actor.id,
          entityTitle: entity.title,
        },
      });
    }

    return {
      entityType: dto.entityType,
      entityId: dto.entityId,
      totalRecipients: notifiedRecipientIds.length,
      shares,
    };
  }

  async findReceived(actor: ShareActor, type?: EntityType) {
    this.assertUserOnly(actor);
    if (type) {
      this.assertShareableEntityType(type);

      if (!this.canUseEntityType(actor, type)) {
        return [];
      }
    }

    const shares = await this.prisma.share.findMany({
      where: {
        recipientId: actor.id,
        status: ShareStatus.ACCEPTED,
        revokedAt: null,
        removedAt: null,
        ...(type ? { entityType: type } : {}),
      },
      include: this.includeShareRelations(),
      orderBy: { createdAt: 'desc' },
    });

    return this.filterVisibleShares(actor, shares);
  }

  /** Compartilhamentos recebidos aguardando aprovação do destinatário. */
  async findPending(actor: ShareActor, type?: EntityType) {
    this.assertUserOnly(actor);
    if (type) {
      this.assertShareableEntityType(type);
      if (!this.canUseEntityType(actor, type)) {
        return [];
      }
    }

    const shares = await this.prisma.share.findMany({
      where: {
        recipientId: actor.id,
        status: ShareStatus.PENDING,
        revokedAt: null,
        removedAt: null,
        ...(type ? { entityType: type } : {}),
      },
      include: this.includeShareRelations(),
      orderBy: { createdAt: 'desc' },
    });

    return this.filterVisibleShares(actor, shares);
  }

  async approve(actor: { id: string; role: UserRole }, shareId: string) {
    this.assertUserOnly(actor);

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { id: true, recipientId: true, status: true, revokedAt: true, removedAt: true },
    });

    if (!share || share.revokedAt || share.removedAt) {
      throw new NotFoundException('Share not found');
    }

    if (share.recipientId !== actor.id) {
      throw new ForbiddenException('Only recipient can approve a share');
    }

    return this.prisma.share.update({
      where: { id: shareId },
      data: { status: ShareStatus.ACCEPTED, approvedAt: new Date() },
      include: this.includeShareRelations(),
    });
  }

  /** Recusa: descarta o compartilhamento pendente (soft delete no lado do destinatário). */
  async reject(actor: { id: string; role: UserRole }, shareId: string) {
    this.assertUserOnly(actor);

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { id: true, recipientId: true, revokedAt: true, removedAt: true },
    });

    if (!share || share.revokedAt || share.removedAt) {
      throw new NotFoundException('Share not found');
    }

    if (share.recipientId !== actor.id) {
      throw new ForbiddenException('Only recipient can reject a share');
    }

    await this.prisma.share.update({
      where: { id: shareId },
      data: { removedAt: new Date() },
    });

    return { success: true };
  }

  async findSent(actor: ShareActor, type?: EntityType) {
    this.assertUserOnly(actor);
    if (type) {
      this.assertShareableEntityType(type);

      if (!this.canUseEntityType(actor, type)) {
        return [];
      }
    }

    const shares = await this.prisma.share.findMany({
      where: {
        ownerId: actor.id,
        revokedAt: null,
        ...(type ? { entityType: type } : {}),
      },
      include: this.includeShareRelations(),
      orderBy: { createdAt: 'desc' },
    });

    return this.filterVisibleShares(actor, shares);
  }

  async findRecipients(actor: ShareActor) {
    return this.findRecipientsForEntity(actor);
  }

  async findRecipientsForEntity(
    actor: ShareActor,
    entityType?: EntityType,
    entityId?: string,
  ) {
    // Admin/suporte também lista destinatários (para compartilhar conteúdo próprio).
    if ((entityType && !entityId) || (!entityType && entityId)) {
      throw new BadRequestException('entityType and entityId must be provided together');
    }

    const activeSharesByRecipientId = new Map<string, string>();

    if (entityType && entityId) {
      this.assertShareableEntityType(entityType);

      if (!this.canUseEntityType(actor, entityType)) {
        throw new ForbiddenException('Permission denied for this content type');
      }

      const entity = await this.resolveEntity(entityType, entityId);
      if (entity.ownerId !== actor.id) {
        throw new ForbiddenException('You can only view recipients for your own content');
      }

      const entityWhere = this.buildEntityWhere(entityType, entityId);
      const activeShares = await this.prisma.share.findMany({
        where: {
          ownerId: actor.id,
          entityType,
          revokedAt: null,
          removedAt: null,
          ...entityWhere,
        },
        select: {
          id: true,
          recipientId: true,
        },
      });

      activeShares.forEach((share) => {
        activeSharesByRecipientId.set(share.recipientId, share.id);
      });
    }

    // Destinatários possíveis: para o admin/suporte, todos os usuários comuns
    // ativos (ele compartilha com todos); para um usuário, apenas seus amigos.
    // Em ambos os casos o admin nunca é destinatário (share PARA admin é barrado).
    let recipients: { id: string; name: string; email: string; avatarUrl: string | null }[];

    if (actor.role === UserRole.SUPERADMIN) {
      recipients = await this.prisma.user.findMany({
        where: {
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          id: { not: actor.id },
        },
        select: { id: true, name: true, email: true, avatarUrl: true },
        orderBy: { name: 'asc' },
      });
    } else {
      recipients = (await this.friendsService.listFriends(actor.id))
        .map((entry) => entry.friend)
        .filter((friend) => friend.role === UserRole.USER)
        .sort((left, right) => left.name.localeCompare(right.name));
    }

    return recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      avatarUrl: recipient.avatarUrl,
      alreadyShared: activeSharesByRecipientId.has(recipient.id),
      activeShareId: activeSharesByRecipientId.get(recipient.id) ?? null,
    }));
  }

  async updateLocalCategory(
    actor: { id: string; role: UserRole },
    shareId: string,
    dto: UpdateShareLocalCategoryDto,
  ) {
    this.assertUserOnly(actor);

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        recipientId: true,
        revokedAt: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.revokedAt) {
      throw new ForbiddenException('Share is revoked');
    }

    if (share.recipientId !== actor.id) {
      throw new ForbiddenException('Only recipient can set local category');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true, ownerId: true },
      });
      if (!category || category.ownerId !== actor.id) {
        throw new ForbiddenException('Category not authorized');
      }
    }

    return this.prisma.share.update({
      where: { id: shareId },
      data: {
        localCategoryId: dto.categoryId ?? null,
      },
      include: this.includeShareRelations(),
    });
  }

  async removeReceived(actor: { id: string; role: UserRole }, shareId: string) {
    this.assertUserOnly(actor);

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        recipientId: true,
        revokedAt: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.recipientId !== actor.id) {
      throw new ForbiddenException('Only recipient can remove a received share');
    }

    if (share.revokedAt) {
      throw new ForbiddenException('Share is revoked');
    }

    return this.prisma.share.update({
      where: { id: shareId },
      data: { removedAt: new Date() },
    });
  }

  async revoke(actor: { id: string; role: UserRole }, shareId: string) {
    this.assertUserOnly(actor);

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        ownerId: true,
        recipientId: true,
        entityType: true,
        linkId: true,
        scheduleId: true,
        noteId: true,
      },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    if (share.ownerId !== actor.id) {
      throw new ForbiddenException('Only owner can revoke a share');
    }

    const revoked = await this.prisma.share.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
      include: this.includeShareRelations(),
    });

    const entityId = share.linkId || share.scheduleId || share.noteId || '';
    await this.notificationsService.createBulk([share.recipientId], {
      type: NotificationType.CONTENT_SHARE_REVOKED,
      entityType: share.entityType,
      entityId,
      title: 'Compartilhamento revogado',
      message: 'Um compartilhamento foi revogado pelo proprietario',
      actionUrl: '/compartilhados',
    });

    return revoked;
  }
}
