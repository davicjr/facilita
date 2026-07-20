import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityType,
  FriendshipStatus,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const friendUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
} as const;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Amizade é simétrica quando aceita: A-B e B-A são o mesmo vínculo.
   * Usado por shares e chat para liberar (ou barrar) a interação.
   */
  async areFriends(userId: string, otherId: string): Promise<boolean> {
    if (userId === otherId) {
      return false;
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: userId },
        ],
      },
      select: { id: true },
    });

    return Boolean(friendship);
  }

  async assertFriends(userId: string, otherId: string) {
    if (!(await this.areFriends(userId, otherId))) {
      throw new ForbiddenException(
        'Voce precisa ser amigo deste usuario para realizar esta acao.',
      );
    }
  }

  async assertFriendsWithAll(userId: string, otherIds: string[]) {
    const uniqueIds = [...new Set(otherIds)].filter((id) => id !== userId);
    await Promise.all(uniqueIds.map((id) => this.assertFriends(userId, id)));
  }

  /**
   * "Conectado" = pode interagir (chat/compartilhar). Vale entre amigos aceitos
   * OU quando um dos lados é o admin/suporte (implicitamente ligado a todos).
   */
  async areConnected(userId: string, otherId: string): Promise<boolean> {
    if (userId === otherId) {
      return false;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [userId, otherId] } },
      select: { id: true, role: true },
    });

    if (users.some((user) => user.role === UserRole.SUPERADMIN)) {
      return true;
    }

    return this.areFriends(userId, otherId);
  }

  async assertConnected(userId: string, otherId: string) {
    if (!(await this.areConnected(userId, otherId))) {
      throw new ForbiddenException(
        'Voce precisa ser amigo deste usuario para realizar esta acao.',
      );
    }
  }

  async assertConnectedWithAll(userId: string, otherIds: string[]) {
    const uniqueIds = [...new Set(otherIds)].filter((id) => id !== userId);
    await Promise.all(uniqueIds.map((id) => this.assertConnected(userId, id)));
  }

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException(
        'Nao e possivel enviar pedido de amizade para si mesmo.',
      );
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
      select: { id: true, role: true, status: true, name: true },
    });

    if (!addressee || addressee.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (addressee.role === UserRole.SUPERADMIN) {
      throw new BadRequestException('Nao e possivel adicionar este usuario.');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('Voces ja sao amigos.');
      }

      // O outro já havia me enviado um pedido pendente: aceitar em vez de duplicar.
      if (existing.addresseeId === requesterId) {
        return this.accept(requesterId, existing.id);
      }

      throw new BadRequestException('Pedido de amizade ja enviado.');
    }

    const friendship = await this.prisma.friendship.create({
      data: { requesterId, addresseeId, status: FriendshipStatus.PENDING },
      include: { addressee: { select: friendUserSelect } },
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true },
    });

    await this.notificationsService.createBulk([addresseeId], {
      type: NotificationType.FRIEND_REQUEST,
      entityType: EntityType.USER,
      entityId: requesterId,
      title: 'Novo pedido de amizade',
      message: `${requester?.name ?? 'Alguem'} quer se conectar com voce`,
      actionUrl: '/amigos',
      metadata: { requesterId },
    });

    return friendship;
  }

  async accept(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Pedido de amizade nao encontrado.');
    }

    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException(
        'Apenas quem recebeu o pedido pode aceita-lo.',
      );
    }

    if (friendship.status === FriendshipStatus.ACCEPTED) {
      return friendship;
    }

    const accepted = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED, acceptedAt: new Date() },
      include: { requester: { select: friendUserSelect } },
    });

    const accepter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.notificationsService.createBulk([friendship.requesterId], {
      type: NotificationType.FRIEND_ACCEPTED,
      entityType: EntityType.USER,
      entityId: userId,
      title: 'Pedido de amizade aceito',
      message: `${accepter?.name ?? 'Alguem'} aceitou seu pedido de amizade`,
      actionUrl: '/amigos',
      metadata: { friendId: userId },
    });

    return accepted;
  }

  /** Remove um pedido PENDENTE: recusa (destinatário) ou cancelamento (remetente). */
  async removeRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Pedido de amizade nao encontrado.');
    }

    if (
      friendship.requesterId !== userId &&
      friendship.addresseeId !== userId
    ) {
      throw new ForbiddenException('Voce nao participa deste pedido.');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Este pedido nao esta mais pendente.');
    }

    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    return { success: true };
  }

  /** Desfaz uma amizade já aceita, a partir do id do OUTRO usuário. */
  async removeFriend(userId: string, otherUserId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { requesterId: userId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: userId },
        ],
      },
      select: { id: true },
    });

    if (!friendship) {
      throw new NotFoundException('Amizade nao encontrada.');
    }

    await this.prisma.friendship.delete({ where: { id: friendship.id } });
    return { success: true };
  }

  async listFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: friendUserSelect },
        addressee: { select: friendUserSelect },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    return friendships.map((friendship) => ({
      friendshipId: friendship.id,
      since: friendship.acceptedAt,
      friend:
        friendship.requesterId === userId
          ? friendship.addressee
          : friendship.requester,
    }));
  }

  async listReceivedRequests(userId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      include: { requester: { select: friendUserSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      user: request.requester,
    }));
  }

  async listSentRequests(userId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: { requesterId: userId, status: FriendshipStatus.PENDING },
      include: { addressee: { select: friendUserSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((request) => ({
      id: request.id,
      createdAt: request.createdAt,
      user: request.addressee,
    }));
  }

  /** Usuários com quem ainda NÃO há vínculo (nem pendente): candidatos a pedido. */
  async discover(userId: string, search?: string) {
    const related = await this.prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const excludedIds = new Set<string>([userId]);
    related.forEach((friendship) => {
      excludedIds.add(friendship.requesterId);
      excludedIds.add(friendship.addresseeId);
    });

    const query = search?.trim();

    return this.prisma.user.findMany({
      where: {
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        id: { notIn: [...excludedIds] },
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
      },
      select: friendUserSelect,
      orderBy: { name: 'asc' },
      take: 40,
    });
  }
}
