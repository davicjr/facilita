import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const owner = { id: 'user-1', role: 'USER' };
  const superadmin = { id: 'admin-1', role: 'SUPERADMIN' };

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('findAll', () => {
    it('filtra por ownerId e só status ACTIVE por padrão', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await service.findAll({ ownerId: 'user-1' });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ownerId: 'user-1', status: 'ACTIVE' },
        }),
      );
    });

    it('inclui inativas quando includeInactive = true', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await service.findAll({ includeInactive: true });

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('404 quando a categoria não existe', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('cat-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna a categoria quando existe', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });

      const result = await service.findOne('cat-1');

      expect(result).toEqual({ id: 'cat-1' });
    });
  });

  describe('create', () => {
    it('usa status ACTIVE e adminOnly false como padrão', async () => {
      prisma.category.create.mockResolvedValue({ id: 'cat-1' });

      await service.create('user-1', { name: 'Nova' } as never);

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-1',
            adminOnly: false,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('nega quando o ator não é dono nem SUPERADMIN', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        ownerId: 'outro-user',
      });

      await expect(
        service.update('cat-1', owner, { name: 'Novo nome' } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('permite quando o ator é o dono', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        ownerId: 'user-1',
      });
      prisma.category.update.mockResolvedValue({ id: 'cat-1' });

      await service.update('cat-1', owner, { name: 'Novo nome' } as never);

      expect(prisma.category.update).toHaveBeenCalled();
    });

    it('permite quando o ator é SUPERADMIN mesmo sem ser dono', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        ownerId: 'outro-user',
      });
      prisma.category.update.mockResolvedValue({ id: 'cat-1' });

      await service.update('cat-1', superadmin, {
        name: 'Novo nome',
      } as never);

      expect(prisma.category.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('nega quando o ator não é dono nem SUPERADMIN', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        ownerId: 'outro-user',
      });

      await expect(service.remove('cat-1', owner)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('remove quando o ator é o dono', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        ownerId: 'user-1',
      });
      prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      await service.remove('cat-1', owner);

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
    });
  });
});
