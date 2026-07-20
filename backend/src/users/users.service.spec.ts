import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hash-fake'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    link: { count: jest.Mock };
    uploadedSchedule: { count: jest.Mock };
    note: { count: jest.Mock };
    uploadedImage: { count: jest.Mock };
    share: { count: jest.Mock };
    favorite: { count: jest.Mock };
    refreshToken: { count: jest.Mock };
    activityLog: { count: jest.Mock };
    auditLog: { count: jest.Mock };
    notification: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let permissionsService: { getResolvedRolePermissions: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      link: { count: jest.fn().mockResolvedValue(0) },
      uploadedSchedule: { count: jest.fn().mockResolvedValue(0) },
      note: { count: jest.fn().mockResolvedValue(0) },
      uploadedImage: { count: jest.fn().mockResolvedValue(0) },
      share: { count: jest.fn().mockResolvedValue(0) },
      favorite: { count: jest.fn().mockResolvedValue(0) },
      refreshToken: { count: jest.fn().mockResolvedValue(0) },
      activityLog: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { count: jest.fn().mockResolvedValue(0) },
      notification: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    permissionsService = {
      getResolvedRolePermissions: jest.fn().mockResolvedValue({ canViewLinks: true }),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('findAll', () => {
    it('monta filtro OR de busca por nome/email e devolve total via $transaction', async () => {
      prisma.$transaction.mockResolvedValue([[{ id: 'user-1' }], 1]);

      const result = await service.findAll({ search: 'davi' });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ items: [{ id: 'user-1' }], total: 1 });
    });
  });

  describe('findOne', () => {
    it('404 quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna o usuário selecionado quando existe', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'a@a.com' });

      const result = await service.findOne('user-1');

      expect(result).toEqual({ id: 'user-1', email: 'a@a.com' });
    });
  });

  describe('findAuthProfile', () => {
    it('anexa as permissões resolvidas para o role do usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: UserRole.USER,
      });

      const result = await service.findAuthProfile('user-1');

      expect(permissionsService.getResolvedRolePermissions).toHaveBeenCalledWith(
        UserRole.USER,
      );
      expect(result.permissions).toEqual({ canViewLinks: true });
    });
  });

  describe('create', () => {
    it('rejeita e-mail já em uso com ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existente' });

      await expect(
        service.create({ username: 'a@a.com', password: 'x', name: 'A' } as never),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('cria com role USER e status ACTIVE por padrão, senha com hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await service.create({
        username: 'novo@a.com',
        password: 'senha123',
        name: 'Novo',
      } as never);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'novo@a.com',
            passwordHash: 'hash-fake',
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('rejeita troca de e-mail para um já em uso por outro usuário', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', email: 'atual@a.com' })
        .mockResolvedValueOnce({ id: 'outro-user' });

      await expect(
        service.update('user-1', { username: 'ocupado@a.com' } as never),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('permite manter o próprio e-mail sem checar conflito', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'atual@a.com',
      });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await service.update('user-1', { username: 'atual@a.com' } as never);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('aplica mudança de role e status quando informados (rota admin)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'atual@a.com',
      });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      await service.update('user-1', {
        role: UserRole.SUPERADMIN,
        status: UserStatus.INACTIVE,
      } as never);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.SUPERADMIN,
            status: UserStatus.INACTIVE,
          }),
        }),
      );
    });
  });

  describe('updateOwnProfile', () => {
    it('atualiza o perfil e devolve com permissões anexadas', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'atual@a.com',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        role: UserRole.USER,
      });

      const result = await service.updateOwnProfile('user-1', {
        name: 'Novo nome',
      } as never);

      expect(result.permissions).toEqual({ canViewLinks: true });
    });
  });

  describe('remove', () => {
    it('404 quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nega auto-exclusão com ForbiddenException', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(service.remove('user-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('remove quando o alvo existe e o ator é outro usuário', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.user.delete.mockResolvedValue({ id: 'user-2' });

      await service.remove('user-2', 'user-1');

      expect(prisma.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-2' } }),
      );
    });
  });

  describe('getDependencies', () => {
    it('hasAny = false quando todas as contagens são zero', async () => {
      const result = await service.getDependencies('user-1');

      expect(result.hasAny).toBe(false);
    });

    it('hasAny = true quando pelo menos uma contagem é positiva', async () => {
      prisma.link.count.mockResolvedValue(3);

      const result = await service.getDependencies('user-1');

      expect(result.hasAny).toBe(true);
      expect(result.links).toBe(3);
    });
  });
});
