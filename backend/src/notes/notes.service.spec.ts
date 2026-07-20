import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityStatus, UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { ContentHelpersService } from '../common/services/content-helpers.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotesService } from './notes.service';

describe('NotesService', () => {
  let service: NotesService;
  let prisma: {
    note: {
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
      note: {
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
        NotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContentHelpersService, useValue: helpers },
      ],
    }).compile();

    service = module.get(NotesService);
  });

  describe('create', () => {
    it('valida que o ator é dono da categoria antes de criar', async () => {
      helpers.assertCategoryOwner.mockRejectedValue(
        new ForbiddenException('Categoria não autorizada'),
      );

      await expect(
        service.create(owner, { categoryId: 'cat-1' } as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.note.create).not.toHaveBeenCalled();
    });

    it('cria com status ACTIVE por padrão e aplica metadata de share', async () => {
      prisma.note.create.mockResolvedValue({ id: 'note-1', ownerId: 'user-1' });

      const result = await service.create(owner, {
        categoryId: 'cat-1',
        title: 'Título',
        content: 'conteúdo',
      } as never);

      expect(prisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: 'user-1',
            status: EntityStatus.ACTIVE,
          }),
        }),
      );
      expect(result).toEqual({ id: 'note-1', ownerId: 'user-1', withShareMetadata: true });
    });
  });

  describe('findAll', () => {
    it('retorna vazio sem consultar o banco quando não há viewer', async () => {
      const result = await service.findAll(undefined, {});

      expect(result).toEqual([]);
      expect(prisma.note.findMany).not.toHaveBeenCalled();
    });

    it('restringe ao ownerId quando o viewer não é SUPERADMIN', async () => {
      prisma.note.findMany.mockResolvedValue([]);

      await service.findAll(owner, {});

      expect(prisma.note.findMany).toHaveBeenCalledWith(
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

    it('SUPERADMIN vê todos os donos, sem filtro de ownerId', async () => {
      prisma.note.findMany.mockResolvedValue([]);

      await service.findAll(superadmin, {});

      const where = prisma.note.findMany.mock.calls[0][0].where;
      expect(where.AND).not.toContainEqual(
        expect.objectContaining({ ownerId: expect.anything() }),
      );
    });
  });

  describe('findOne', () => {
    it('404 quando a nota não existe', async () => {
      prisma.note.findUnique.mockResolvedValue(null);

      await expect(service.findOne('note-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('404 quando a nota está soft-deletada', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'user-1',
        deletedAt: new Date(),
      });

      await expect(service.findOne('note-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('nega quando o viewer não é dono nem SUPERADMIN', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'outro-user',
        deletedAt: null,
      });

      await expect(service.findOne('note-1', owner)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('SUPERADMIN acessa nota de qualquer dono', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'outro-user',
        deletedAt: null,
      });

      const result = await service.findOne('note-1', superadmin);

      expect(result).toEqual(
        expect.objectContaining({ id: 'note-1', withShareMetadata: true }),
      );
    });
  });

  describe('update', () => {
    it('404 quando a nota não existe ou está deletada', async () => {
      prisma.note.findUnique.mockResolvedValue(null);

      await expect(
        service.update('note-1', owner, {} as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('delega a checagem de autorização para assertCanMutate', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'outro-user',
        categoryId: 'cat-1',
        deletedAt: null,
      });
      helpers.assertCanMutate.mockImplementation(() => {
        throw new ForbiddenException('Nota não autorizada');
      });

      await expect(
        service.update('note-1', owner, {} as never),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.note.update).not.toHaveBeenCalled();
    });

    it('revalida o dono da nova categoria quando categoryId muda', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'user-1',
        categoryId: 'cat-antiga',
        deletedAt: null,
      });
      prisma.note.update.mockResolvedValue({ id: 'note-1' });

      await service.update('note-1', owner, {
        categoryId: 'cat-nova',
      } as never);

      expect(helpers.assertCategoryOwner).toHaveBeenCalledWith(
        'cat-nova',
        'user-1',
      );
    });
  });

  describe('remove', () => {
    it('404 quando a nota não existe', async () => {
      prisma.note.findUnique.mockResolvedValue(null);

      await expect(service.remove('note-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('faz soft-delete setando deletedAt', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'user-1',
        deletedAt: null,
      });
      prisma.note.update.mockResolvedValue({ id: 'note-1', deletedAt: new Date() });

      await service.remove('note-1', owner);

      expect(prisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('restore', () => {
    it('404 quando a nota não existe (mesmo deletada)', async () => {
      prisma.note.findUnique.mockResolvedValue(null);

      await expect(service.restore('note-1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('limpa deletedAt e volta o status para ACTIVE', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'user-1',
        deletedAt: new Date(),
      });
      prisma.note.update.mockResolvedValue({ id: 'note-1' });

      await service.restore('note-1', owner);

      expect(prisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deletedAt: null, status: EntityStatus.ACTIVE },
        }),
      );
    });
  });

  describe('setStatus', () => {
    it('404 quando a nota não existe ou está deletada', async () => {
      prisma.note.findUnique.mockResolvedValue(null);

      await expect(
        service.setStatus('note-1', owner, EntityStatus.INACTIVE),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualiza o status quando autorizado', async () => {
      prisma.note.findUnique.mockResolvedValue({
        id: 'note-1',
        ownerId: 'user-1',
        deletedAt: null,
      });
      prisma.note.update.mockResolvedValue({ id: 'note-1' });

      await service.setStatus('note-1', owner, EntityStatus.INACTIVE);

      expect(prisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EntityStatus.INACTIVE },
        }),
      );
    });
  });
});
