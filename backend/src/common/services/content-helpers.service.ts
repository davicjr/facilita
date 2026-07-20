import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentHelpersService {
  constructor(private readonly prisma: PrismaService) {}

  withShareMetadata<T extends { owner: any; shares?: any[] }>(item: T) {
    const shares = item.shares ?? [];
    return {
      ...item,
      createdBy: item.owner,
      shareCount: shares.length,
      sharedWithPreview: shares.slice(0, 5).map((share) => share.recipient),
    };
  }

  async assertCategoryOwner(
    categoryId: string | null | undefined,
    ownerId: string,
  ) {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, ownerId: true },
    });

    if (!category || category.ownerId !== ownerId) {
      throw new ForbiddenException('Categoria não autorizada');
    }
  }

  assertCanMutate(
    item: { ownerId: string },
    actor: { id?: string; role?: UserRole },
    forbiddenMessage = 'Documento não autorizado',
  ) {
    if (actor.role === UserRole.SUPERADMIN) {
      return;
    }

    if (!actor.id || actor.id !== item.ownerId) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }
}
