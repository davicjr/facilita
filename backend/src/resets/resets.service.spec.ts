import { Test } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResetsService } from './resets.service';
import { defaultRolePermissions } from '../permissions/permissions.constants';

describe('ResetsService', () => {
  let service: ResetsService;
  let tx: {
    favorite: { deleteMany: jest.Mock };
    share: { deleteMany: jest.Mock };
    notification: { deleteMany: jest.Mock };
    link: { deleteMany: jest.Mock };
    uploadedSchedule: { deleteMany: jest.Mock };
    note: { deleteMany: jest.Mock };
    uploadedImage: { deleteMany: jest.Mock };
    category: { deleteMany: jest.Mock };
    systemConfig: { deleteMany: jest.Mock; upsert: jest.Mock };
    refreshToken: { deleteMany: jest.Mock };
    user: { deleteMany: jest.Mock; upsert: jest.Mock };
    rolePermission: { deleteMany: jest.Mock; upsert: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    tx = {
      favorite: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      share: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      notification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      link: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      uploadedSchedule: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      note: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      uploadedImage: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      category: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      systemConfig: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      refreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      rolePermission: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(tx)),
    };

    const module = await Test.createTestingModule({
      providers: [ResetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ResetsService);
  });

  it('só apaga as entidades selecionadas — o resto fica intacto', async () => {
    await service.reset(['links']);

    expect(tx.link.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.favorite.deleteMany).not.toHaveBeenCalled();
    expect(tx.share.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
    expect(tx.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it('reset parcial sem "users"/"rolePermissions" não reseeda nada', async () => {
    const result = await service.reset(['links', 'notes']);

    expect(tx.user.upsert).not.toHaveBeenCalled();
    expect(tx.rolePermission.upsert).not.toHaveBeenCalled();
    expect(result.seeded).toBe(false);
  });

  it('ao selecionar "users", também limpa refreshToken e reseeda o superadmin', async () => {
    process.env.SUPERADMIN_EMAIL = 'superadmin@teste.local';

    await service.reset(['users']);

    expect(tx.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.user.deleteMany).toHaveBeenCalledTimes(1);
    expect(tx.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'superadmin@teste.local' },
        create: expect.objectContaining({
          role: UserRole.SUPERADMIN,
          status: UserStatus.ACTIVE,
        }),
      }),
    );

    delete process.env.SUPERADMIN_EMAIL;
  });

  it('ao selecionar "rolePermissions", reseeda USER e SUPERADMIN com os defaults atuais (sem canAccessAdmin)', async () => {
    await service.reset(['rolePermissions']);

    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(2);
    expect(tx.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: UserRole.USER },
        create: expect.objectContaining(defaultRolePermissions[UserRole.USER]),
      }),
    );
    expect(tx.rolePermission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: UserRole.SUPERADMIN },
        create: expect.objectContaining(defaultRolePermissions[UserRole.SUPERADMIN]),
      }),
    );

    const [[usersCall]] = tx.rolePermission.upsert.mock.calls;
    expect((usersCall.create as Record<string, unknown>).canAccessAdmin).toBeUndefined();
  });

  it('reset completo (todas as entidades) reseeda usuários e permissões', async () => {
    const allEntities = [
      'users',
      'rolePermissions',
      'categories',
      'links',
      'uploadedSchedules',
      'notes',
      'uploadedImages',
      'shares',
      'favorites',
      'notifications',
      'systemConfig',
    ] as const;

    const result = await service.reset([...allEntities]);

    expect(result.seeded).toBe(true);
    expect(tx.user.upsert).toHaveBeenCalledTimes(1);
    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(2);
  });
});
