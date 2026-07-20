import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatRoomType, Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';

const chatUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
});

const chatMemberSelect = Prisma.validator<Prisma.ChatMemberSelect>()({
  id: true,
  roomId: true,
  userId: true,
  joinedAt: true,
  lastReadAt: true,
  removedAt: true,
  user: {
    select: chatUserSelect,
  },
});

const chatMessageSelect = Prisma.validator<Prisma.ChatMessageSelect>()({
  id: true,
  roomId: true,
  senderId: true,
  content: true,
  editedAt: true,
  deletedAt: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
});

const chatRoomSelect = Prisma.validator<Prisma.ChatRoomSelect>()({
  id: true,
  type: true,
  name: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  members: {
    select: chatMemberSelect,
    where: {
      removedAt: null,
    },
    orderBy: {
      joinedAt: 'asc',
    },
  },
  messages: {
    select: chatMessageSelect,
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  },
});

type ChatRoomRecord = Prisma.ChatRoomGetPayload<{ select: typeof chatRoomSelect }>;
type ChatMessageRecord = Prisma.ChatMessageGetPayload<{ select: typeof chatMessageSelect }>;
type ChatRoomSummary = Omit<ChatRoomRecord, 'messages'> & {
  lastMessage?: ChatMessageRecord;
  unreadCount: number;
};

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friendsService: FriendsService,
  ) {}

  async getUserRooms(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId, removedAt: null },
      select: { roomId: true },
    });

    return memberships.map((membership) => membership.roomId);
  }

  async listAvailableUsers(userId: string, search?: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    let candidates: { id: string; name: string; email: string; avatarUrl: string | null; role: UserRole }[];

    if (me?.role === UserRole.SUPERADMIN) {
      // Admin/suporte alcança qualquer usuário ativo.
      candidates = await this.prisma.user.findMany({
        where: { id: { not: userId }, status: UserStatus.ACTIVE },
        select: chatUserSelect,
      });
    } else {
      // Usuário comum conversa com seus amigos + o suporte (admin), sempre disponível.
      const friends = (await this.friendsService.listFriends(userId)).map(
        (entry) => entry.friend,
      );
      const supportAdmins = await this.prisma.user.findMany({
        where: { role: UserRole.SUPERADMIN, status: UserStatus.ACTIVE },
        select: chatUserSelect,
      });
      const byId = new Map<string, (typeof candidates)[number]>();
      [...supportAdmins, ...friends].forEach((user) => byId.set(user.id, user));
      candidates = [...byId.values()];
    }

    const query = search?.trim()?.toLowerCase();
    return candidates
      .filter((user) => {
        if (!query) {
          return true;
        }
        return (
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      })
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 40);
  }

  async getOrCreateDM(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new BadRequestException('Nao e possivel iniciar uma conversa consigo mesmo.');
    }

    await Promise.all([
      this.ensureActiveUser(userId),
      this.ensureActiveUser(recipientId),
    ]);

    await this.friendsService.assertConnected(userId, recipientId);

    const directRooms = await this.prisma.chatRoom.findMany({
      where: {
        type: ChatRoomType.DIRECT,
        AND: [
          { members: { some: { userId, removedAt: null } } },
          { members: { some: { userId: recipientId, removedAt: null } } },
        ],
      },
      select: {
        id: true,
        members: {
          where: {
            removedAt: null,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const existingRoom = directRooms.find((room) => {
      if (room.members.length !== 2) {
        return false;
      }

      const ids = room.members.map((member) => member.userId);
      return ids.includes(userId) && ids.includes(recipientId);
    });

    if (existingRoom) {
      return this.getRoomByIdForUser(existingRoom.id, userId);
    }

    const room = await this.prisma.$transaction(async (tx) => {
      const createdRoom = await tx.chatRoom.create({
        data: {
          type: ChatRoomType.DIRECT,
          createdBy: userId,
        },
        select: { id: true },
      });

      await tx.chatMember.createMany({
        data: [
          { roomId: createdRoom.id, userId, lastReadAt: new Date() },
          { roomId: createdRoom.id, userId: recipientId },
        ],
      });

      return createdRoom;
    });

    return this.getRoomByIdForUser(room.id, userId);
  }

  async createGroup(creatorId: string, name: string, memberIds: string[]) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new BadRequestException('O grupo precisa de um nome.');
    }

    const uniqueMemberIds = [...new Set([creatorId, ...memberIds])];
    await this.ensureUsersExist(uniqueMemberIds);
    await this.friendsService.assertConnectedWithAll(
      creatorId,
      uniqueMemberIds.filter((id) => id !== creatorId),
    );

    const room = await this.prisma.$transaction(async (tx) => {
      const createdRoom = await tx.chatRoom.create({
        data: {
          type: ChatRoomType.GROUP,
          name: trimmedName,
          createdBy: creatorId,
        },
        select: { id: true },
      });

      await tx.chatMember.createMany({
        data: uniqueMemberIds.map((userId) => ({
          roomId: createdRoom.id,
          userId,
          ...(userId === creatorId ? { lastReadAt: new Date() } : {}),
        })),
      });

      return createdRoom;
    });

    return this.getRoomByIdForUser(room.id, creatorId);
  }

  async getRoomsForUser(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: { userId, removedAt: null },
        },
      },
      select: chatRoomSelect,
    });

    const result = await Promise.all(
      rooms.map((room) => this.toRoomSummary(room, userId)),
    );

    return result.sort((left, right) => {
      const leftTimestamp = new Date(
        left.lastMessage?.createdAt ?? left.updatedAt,
      ).getTime();
      const rightTimestamp = new Date(
        right.lastMessage?.createdAt ?? right.updatedAt,
      ).getTime();

      return rightTimestamp - leftTimestamp;
    });
  }

  async getRoomByIdForUser(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        members: {
          some: { userId, removedAt: null },
        },
      },
      select: chatRoomSelect,
    });

    if (!room) {
      throw new NotFoundException('Sala de chat nao encontrada.');
    }

    return this.toRoomSummary(room, userId);
  }

  async getMessages(roomId: string, userId: string, cursor?: string, limit = 50) {
    await this.ensureRoomMembership(roomId, userId);

    const take = Math.min(Math.max(limit, 1), 100);
    const cursorDate = this.parseCursor(cursor);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: take + 1,
      select: chatMessageSelect,
    });

    const hasMore = messages.length > take;
    const page = hasMore ? messages.slice(0, take) : messages;
    const items = [...page]
      .reverse()
      .map((message) => this.redactDeletedMessage(message));

    return {
      items,
      nextCursor: hasMore ? items[0]?.createdAt.toISOString() ?? null : null,
    };
  }

  async sendMessage(roomId: string, senderId: string, content: string) {
    await this.ensureRoomMembership(roomId, senderId);
    const normalizedContent = this.normalizeContent(content);

    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          roomId,
          senderId,
          content: normalizedContent,
        },
        select: chatMessageSelect,
      });

      await this.touchRoom(tx, roomId);
      return message;
    });
  }

  async markAsRead(roomId: string, userId: string) {
    await this.ensureRoomMembership(roomId, userId);
    const lastReadAt = new Date();

    await this.prisma.chatMember.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        lastReadAt,
      },
    });

    return { roomId, userId, lastReadAt };
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const normalizedContent = this.normalizeContent(content);
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem nao encontrada.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Voce nao pode editar esta mensagem.');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Mensagens apagadas nao podem ser editadas.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          content: normalizedContent,
          editedAt: new Date(),
        },
        select: chatMessageSelect,
      });

      await this.touchRoom(tx, updated.roomId);
      return updated;
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        roomId: true,
        senderId: true,
        deletedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem nao encontrada.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Voce nao pode apagar esta mensagem.');
    }

    if (message.deletedAt) {
      return {
        messageId: message.id,
        roomId: message.roomId,
        deletedAt: message.deletedAt,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();

      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt,
        },
      });

      await this.touchRoom(tx, message.roomId);

      return {
        messageId,
        roomId: message.roomId,
        deletedAt,
      };
    });
  }

  async addMember(roomId: string, actorId: string, userId: string) {
    const room = await this.ensureGroupRoomForActor(roomId, actorId);

    if (room.members.some((member) => member.userId === userId)) {
      return this.getRoomByIdForUser(roomId, actorId);
    }

    await this.ensureActiveUser(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.chatMember.create({
        data: {
          roomId,
          userId,
        },
      });

      await this.touchRoom(tx, roomId);
    });

    return this.getRoomByIdForUser(roomId, actorId);
  }

  async removeMember(roomId: string, actorId: string, userId: string) {
    const room = await this.ensureGroupRoomForActor(roomId, actorId);
    const membership = room.members.find((member) => member.userId === userId);

    if (!membership) {
      throw new NotFoundException('O usuario nao faz parte desta sala.');
    }

    if (userId !== actorId && room.createdBy !== actorId) {
      throw new ForbiddenException(
        'Somente o criador do grupo pode remover outros participantes.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.chatMember.delete({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
      });

      await this.touchRoom(tx, roomId);

      const remainingMembers = await tx.chatMember.findMany({
        where: { roomId },
        select: { userId: true },
      });

      return {
        remainingMemberIds: remainingMembers.map((member) => member.userId),
        actorStillMember: remainingMembers.some((member) => member.userId === actorId),
      };
    });

    return {
      roomId,
      removedUserId: userId,
      remainingMemberIds: result.remainingMemberIds,
      room: result.actorStillMember
        ? await this.getRoomByIdForUser(roomId, actorId)
        : null,
    };
  }

  async deleteRoomForUser(roomId: string, userId: string) {
    await this.ensureRoomMembership(roomId, userId);

    return this.prisma.$transaction(async (tx) => {
      await tx.chatMember.update({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
        data: {
          removedAt: new Date(),
          lastReadAt: new Date(),
        },
      });

      const activeMembers = await tx.chatMember.findMany({
        where: {
          roomId,
          removedAt: null,
        },
        select: {
          userId: true,
        },
      });

      if (activeMembers.length === 0) {
        await tx.chatRoom.delete({
          where: { id: roomId },
        });
      } else {
        await this.touchRoom(tx, roomId);
      }

      return {
        roomId,
        removedUserId: userId,
        remainingUserIds: activeMembers.map((member) => member.userId),
      };
    });
  }

  async ensureRoomMembership(roomId: string, userId: string) {
    const membership = await this.prisma.chatMember.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Voce nao participa desta sala.');
    }

    if (membership.removedAt) {
      throw new ForbiddenException('Voce nao participa desta sala.');
    }

    return membership;
  }

  private async toRoomSummary(room: ChatRoomRecord, userId: string): Promise<ChatRoomSummary> {
    const currentMember = room.members.find((member) => member.userId === userId);
    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        roomId: room.id,
        senderId: { not: userId },
        deletedAt: null,
        ...(currentMember?.lastReadAt
          ? { createdAt: { gt: currentMember.lastReadAt } }
          : {}),
      },
    });

    return {
      id: room.id,
      type: room.type,
      name: room.name,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members,
      lastMessage: room.messages[0]
        ? this.redactDeletedMessage(room.messages[0])
        : undefined,
      unreadCount,
    };
  }

  private async ensureGroupRoomForActor(roomId: string, actorId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        members: {
          some: { userId: actorId, removedAt: null },
        },
      },
      select: {
        id: true,
        type: true,
        createdBy: true,
        members: {
          where: {
            removedAt: null,
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Sala de chat nao encontrada.');
    }

    if (room.type !== ChatRoomType.GROUP) {
      throw new BadRequestException('Esta operacao so e permitida em grupos.');
    }

    return room;
  }

  private async ensureActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
      },
      select: chatUserSelect,
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return user;
  }

  private async ensureUsersExist(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      throw new NotFoundException('Um ou mais usuarios nao foram encontrados.');
    }
  }

  private redactDeletedMessage<
    T extends { deletedAt: Date | null; content: string },
  >(message: T): T {
    // Mensagem apagada nunca trafega com o conteúdo original — o texto
    // permanece apenas no banco (auditoria). Sem isso, qualquer refetch
    // "ressuscitava" o conteúdo apagado no cliente.
    return message.deletedAt ? { ...message, content: '' } : message;
  }

  private normalizeContent(content: string) {
    const value = content.trim();

    if (!value) {
      throw new BadRequestException('A mensagem nao pode ser vazia.');
    }

    if (value.length > 2000) {
      throw new BadRequestException('A mensagem excede o limite de 2000 caracteres.');
    }

    return value;
  }

  private parseCursor(cursor?: string) {
    if (!cursor) {
      return null;
    }

    const parsed = new Date(cursor);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Cursor invalido.');
    }

    return parsed;
  }

  private async touchRoom(prisma: PrismaExecutor, roomId: string) {
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        updatedAt: new Date(),
      },
    });
  }
}
