import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: {
    link: { findUnique: jest.Mock };
    uploadedSchedule: { findUnique: jest.Mock };
    note: { findUnique: jest.Mock };
    share: { findFirst: jest.Mock };
    favorite: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  const actorWithLinkAccess = {
    id: 'user-1',
    permissions: { canViewLinks: true } as never,
  };

  beforeEach(async () => {
    prisma = {
      link: { findUnique: jest.fn() },
      uploadedSchedule: { findUnique: jest.fn() },
      note: { findUnique: jest.fn() },
      share: { findFirst: jest.fn() },
      favorite: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(FavoritesService);
  });

  describe('create', () => {
    it('rejeita tipo de entidade não suportado', async () => {
      await expect(
        service.create(actorWithLinkAccess, {
          entityType: 'CATEGORY' as EntityType,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('exige exatamente um ID (linkId/scheduleId/noteId)', async () => {
      await expect(
        service.create(actorWithLinkAccess, {
          entityType: EntityType.LINK,
          linkId: 'link-1',
          scheduleId: 'schedule-1',
        } as never),
      ).rejects.toThrow('Forneça exatamente um ID');
    });

    it('nega quando o ator não tem permissão de visualizar esse tipo de conteúdo', async () => {
      await expect(
        service.create(
          { id: 'user-1', permissions: { canViewLinks: false } as never },
          { entityType: EntityType.LINK, linkId: 'link-1' } as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('retorna 404 quando o link não existe, está deletado, ou não é acessível pelo ator', async () => {
      prisma.link.findUnique.mockResolvedValue(null);

      await expect(
        service.create(actorWithLinkAccess, {
          entityType: EntityType.LINK,
          linkId: 'link-inexistente',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('permite favoritar link de outro dono quando há compartilhamento ativo', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        ownerId: 'outro-user',
        deletedAt: null,
      });
      prisma.share.findFirst.mockResolvedValue({ id: 'share-1' });
      prisma.favorite.findFirst.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue({ id: 'fav-1' });

      const result = await service.create(actorWithLinkAccess, {
        entityType: EntityType.LINK,
        linkId: 'link-1',
      } as never);

      expect(prisma.share.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: 'user-1',
            linkId: 'link-1',
            revokedAt: null,
            removedAt: null,
          }),
        }),
      );
      expect(result).toEqual({ id: 'fav-1' });
    });

    it('rejeita duplicata com ConflictException', async () => {
      prisma.link.findUnique.mockResolvedValue({
        id: 'link-1',
        ownerId: 'user-1',
        deletedAt: null,
      });
      prisma.favorite.findFirst.mockResolvedValue({ id: 'fav-existente' });

      await expect(
        service.create(actorWithLinkAccess, {
          entityType: EntityType.LINK,
          linkId: 'link-1',
        } as never),
      ).rejects.toThrow(ConflictException);

      expect(prisma.favorite.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('404 quando o favorito não existe', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);

      await expect(service.remove('fav-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('não deixa remover favorito de outro usuário', async () => {
      prisma.favorite.findUnique.mockResolvedValue({
        id: 'fav-1',
        userId: 'outro-user',
      });

      await expect(service.remove('fav-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.favorite.delete).not.toHaveBeenCalled();
    });

    it('remove quando o dono confere', async () => {
      prisma.favorite.findUnique.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
      });
      prisma.favorite.delete.mockResolvedValue({ id: 'fav-1' });

      const result = await service.remove('fav-1', 'user-1');

      expect(prisma.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'fav-1' },
      });
      expect(result.message).toMatch(/removido/i);
    });
  });

  describe('isFavorited', () => {
    it('retorna false sem consultar o banco quando o ator não tem permissão', async () => {
      const result = await service.isFavorited(
        { id: 'user-1', permissions: { canViewLinks: false } as never },
        EntityType.LINK,
        'link-1',
      );

      expect(result).toBe(false);
      expect(prisma.favorite.findFirst).not.toHaveBeenCalled();
    });

    it('consulta por linkId quando entityType = LINK', async () => {
      prisma.favorite.findFirst.mockResolvedValue({ id: 'fav-1' });

      const result = await service.isFavorited(
        actorWithLinkAccess,
        EntityType.LINK,
        'link-1',
      );

      expect(prisma.favorite.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', entityType: EntityType.LINK, linkId: 'link-1' },
      });
      expect(result).toBe(true);
    });
  });
});
