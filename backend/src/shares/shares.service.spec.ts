import { Test } from '@nestjs/testing';
import { EntityType, ShareStatus, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FriendsService } from '../friends/friends.service';
import { SharesService } from './shares.service';

describe('SharesService.create — dedup de destinatários existentes', () => {
  let service: SharesService;
  let prisma: {
    link: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
    share: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let notificationsService: { createBulk: jest.Mock };
  let friendsService: { assertConnectedWithAll: jest.Mock };

  const owner = {
    id: 'owner-1',
    role: UserRole.USER,
    permissions: { canViewLinks: true } as never,
  };

  beforeEach(async () => {
    prisma = {
      link: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
      share: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    notificationsService = { createBulk: jest.fn() };
    friendsService = { assertConnectedWithAll: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        SharesService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: FriendsService, useValue: friendsService },
      ],
    }).compile();

    service = module.get(SharesService);

    prisma.link.findUnique.mockResolvedValue({
      id: 'link-1',
      title: 'Link de teste',
      ownerId: owner.id,
    });

    const allUsers = [
      { id: 'r1', role: UserRole.USER, status: UserStatus.ACTIVE },
      { id: 'r2', role: UserRole.USER, status: UserStatus.ACTIVE },
      { id: 'r3', role: UserRole.USER, status: UserStatus.ACTIVE },
    ];
    prisma.user.findMany.mockImplementation(({ where }) => {
      const ids: string[] = where.id.in;
      return Promise.resolve(allUsers.filter((user) => ids.includes(user.id)));
    });
  });

  it('faz apenas UM findMany para N destinatários, não um findFirst por destinatário', async () => {
    prisma.share.findMany.mockResolvedValue([]);
    prisma.share.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: `share-${data.recipientId}` }),
    );

    await service.create(owner, {
      entityType: EntityType.LINK,
      entityId: 'link-1',
      recipientIds: ['r1', 'r2', 'r3'],
    } as never);

    expect(prisma.share.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.share.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ownerId: owner.id,
          recipientId: { in: ['r1', 'r2', 'r3'] },
          entityType: EntityType.LINK,
          linkId: 'link-1',
        }),
      }),
    );
    expect(prisma.share.create).toHaveBeenCalledTimes(3);
  });

  it('reaproveita o compartilhamento já ativo (não recria) e não reenvia notificação pra ele', async () => {
    prisma.share.findMany.mockResolvedValue([
      {
        id: 'share-r1',
        recipientId: 'r1',
        revokedAt: null,
        removedAt: null,
      },
    ]);
    prisma.share.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: `share-${data.recipientId}` }),
    );

    const result = await service.create(owner, {
      entityType: EntityType.LINK,
      entityId: 'link-1',
      recipientIds: ['r1', 'r2'],
    } as never);

    expect(prisma.share.create).toHaveBeenCalledTimes(1);
    expect(prisma.share.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipientId: 'r2' }) }),
    );
    expect(prisma.share.update).not.toHaveBeenCalled();
    // r1 já estava ativo -> não entra na notificação; só r2 é novo.
    expect(result.totalRecipients).toBe(1);
    expect(notificationsService.createBulk).toHaveBeenCalledWith(
      ['r2'],
      expect.anything(),
    );
  });

  it('reativa (update) um compartilhamento revogado em vez de criar um novo', async () => {
    prisma.share.findMany.mockResolvedValue([
      {
        id: 'share-r1',
        recipientId: 'r1',
        revokedAt: new Date('2026-01-01'),
        removedAt: null,
      },
    ]);
    prisma.share.update.mockResolvedValue({
      id: 'share-r1',
      recipientId: 'r1',
      status: ShareStatus.PENDING,
    });

    const result = await service.create(owner, {
      entityType: EntityType.LINK,
      entityId: 'link-1',
      recipientIds: ['r1'],
    } as never);

    expect(prisma.share.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'share-r1' },
        data: expect.objectContaining({ revokedAt: null, removedAt: null }),
      }),
    );
    expect(prisma.share.create).not.toHaveBeenCalled();
    expect(result.totalRecipients).toBe(1);
  });
});
