import { Injectable } from '@nestjs/common';
import { EntityType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: dto,
    });
  }

  async createBulk(
    userIds: string[],
    dto: Omit<CreateNotificationDto, 'userId'>,
  ) {
    if (userIds.length === 0) {
      return { count: 0 };
    }

    const notifications = userIds.map((userId) => ({
      userId,
      ...dto,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async findByUser(userId: string, limit = 50, offset = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async cleanupOld() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });
  }
}
