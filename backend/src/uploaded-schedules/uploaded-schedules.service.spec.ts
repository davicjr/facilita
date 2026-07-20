import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityStatus, UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { ContentHelpersService } from '../common/services/content-helpers.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedSchedulesService } from './uploaded-schedules.service';

describe('UploadedSchedulesService', () => {
  let service: UploadedSchedulesService;
  let prisma: {
    uploadedSchedule: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let helpers: {
    assertCategoryOwner: jest.Mock;
    withShareMetadata: jest.Mock;
    assertCanMutate: jest.Mock;
  };

  const owner = { id: 'user-1', role: UserRole.USER };
  const superadmin = { id: 'admin-1', role: UserRole.SUPERADMIN };

  beforeEach(async () => {
    prisma = {
      uploadedSchedule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    helpers = {
      assertCategoryOwner: jest.fn(),
      withShareMetadata: jest.fn((item) => ({ ...item, withShareMetadata: true })),
      assertCanMutate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UploadedSchedulesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContentHelpersService, useValue: helpers },
      ],
    }).compile();

    service = module.get(UploadedSchedulesService);
  });

  describe('create', () => {
    it('valida que o ator é dono da categoria antes de criar', async () => {
      helpers.assertCategoryOwner.mockRejectedValue(
        new ForbiddenException('Categoria não autorizada'),
      );

      await expect(
        service.create(owner, { categoryId: 'cat-1' } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.uploadedSchedule.create).not.toHaveBeenCalled();
    });

    it('cria com status ACTIVE por padrão e aplica metadata de share', async () => {
      prisma.uploadedSchedule.create.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
      });

      const result = await service.create(owner, {
        categoryId: 'cat-1',
        title: 'Título',
        fileUrl: 'http://x',
        fileName: 'x.pdf',
      } as never);

      expect(prisma.uploadedSchedule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-1',
            status: EntityStatus.ACTIVE,
          }),
        }),
      );
      expect(result).toEqual({
        id: 'sched-1',
        ownerId: 'user-1',
        withShareMetadata: true,
      });
    });
  });

  describe('findAll', () => {
    it('retorna vazio sem consultar o banco quando não há viewer', async () => {
      const result = await service.findAll(undefined, {});

      expect(result).toEqual([]);
      expect(prisma.uploadedSchedule.findMany).not.toHaveBeenCalled();
    });

    it('restringe ao ownerId quando o viewer não é SUPERADMIN', async () => {
      prisma.uploadedSchedule.findMany.mockResolvedValue([]);

      await service.findAll(owner, {});

      expect(prisma.uploadedSchedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { ownerId: 'user-1' },
              { status: EntityStatus.ACTIVE },
            ]),
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('404 quando o documento não existe', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('sched-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nega quando o viewer não é dono nem SUPERADMIN', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'outro-user',
        deletedAt: null,
      });

      await expect(service.findOne('sched-1', owner)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getDownloadInfo', () => {
    it('404 quando o documento não existe ou está deletado', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue(null);

      await expect(
        service.getDownloadInfo('sched-1', owner),
      ).rejects.toThrow(NotFoundException);
    });

    it('permite o dono baixar mesmo sem share', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        shares: [],
      });

      const result = await service.getDownloadInfo('sched-1', owner);

      expect(result.id).toBe('sched-1');
    });

    it('permite SUPERADMIN baixar mesmo sem ser dono ou destinatário', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'outro-user',
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        shares: [],
      });

      const result = await service.getDownloadInfo('sched-1', superadmin);

      expect(result.id).toBe('sched-1');
    });

    it('permite destinatário de share ativo baixar quando o documento está ACTIVE', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'outro-user',
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        shares: [{ recipient: { id: 'user-1' } }],
      });

      const result = await service.getDownloadInfo('sched-1', owner);

      expect(result.id).toBe('sched-1');
    });

    it('nega destinatário de share quando o documento não está ACTIVE', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'outro-user',
        deletedAt: null,
        status: EntityStatus.INACTIVE,
        shares: [{ recipient: { id: 'user-1' } }],
      });

      await expect(
        service.getDownloadInfo('sched-1', owner),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nega quando não há share nem é dono/SUPERADMIN', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'outro-user',
        deletedAt: null,
        status: EntityStatus.ACTIVE,
        shares: [],
      });

      await expect(
        service.getDownloadInfo('sched-1', owner),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('404 quando o documento não existe ou está deletado', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue(null);

      await expect(
        service.update('sched-1', owner, {} as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('revalida o dono da nova categoria quando categoryId muda', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
        categoryId: 'cat-antiga',
        deletedAt: null,
      });
      prisma.uploadedSchedule.update.mockResolvedValue({ id: 'sched-1' });

      await service.update('sched-1', owner, {
        categoryId: 'cat-nova',
      } as never);

      expect(helpers.assertCategoryOwner).toHaveBeenCalledWith(
        'cat-nova',
        'user-1',
      );
    });
  });

  describe('remove', () => {
    it('faz soft-delete setando deletedAt', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
        deletedAt: null,
      });
      prisma.uploadedSchedule.update.mockResolvedValue({
        id: 'sched-1',
        deletedAt: new Date(),
      });

      await service.remove('sched-1', owner);

      expect(prisma.uploadedSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sched-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('restore', () => {
    it('limpa deletedAt e volta o status para ACTIVE', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
        deletedAt: new Date(),
      });
      prisma.uploadedSchedule.update.mockResolvedValue({ id: 'sched-1' });

      await service.restore('sched-1', owner);

      expect(prisma.uploadedSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedAt: null, status: EntityStatus.ACTIVE },
        }),
      );
    });
  });

  describe('setStatus', () => {
    it('atualiza o status quando autorizado', async () => {
      prisma.uploadedSchedule.findUnique.mockResolvedValue({
        id: 'sched-1',
        ownerId: 'user-1',
        deletedAt: null,
      });
      prisma.uploadedSchedule.update.mockResolvedValue({ id: 'sched-1' });

      await service.setStatus('sched-1', owner, EntityStatus.INACTIVE);

      expect(prisma.uploadedSchedule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EntityStatus.INACTIVE },
        }),
      );
    });
  });
});
