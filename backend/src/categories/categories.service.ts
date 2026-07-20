import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly categoryInclude = {
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        links: true,
        schedules: true,
        notes: true,
      },
    },
  } as const;

  async findAll(options: {
    ownerId?: string;
    includeInactive?: boolean;
  }) {
    return this.prisma.category.findMany({
      where: {
        ...(options.ownerId ? { ownerId: options.ownerId } : {}),
        ...(options.includeInactive ? {} : { status: 'ACTIVE' }),
      },
      include: this.categoryInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.categoryInclude,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(ownerId: string, data: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ownerId,
        name: data.name,
        color: data.color,
        icon: data.icon,
        adminOnly: data.adminOnly ?? false,
        status: data.status ?? 'ACTIVE',
      },
      include: this.categoryInclude,
    });
  }

  async update(id: string, actor: { id: string; role: string }, data: UpdateCategoryDto) {
    const category = await this.findOne(id);
    if (actor.role !== 'SUPERADMIN' && category.ownerId !== actor.id) {
      throw new ForbiddenException('Category not authorized');
    }

    return this.prisma.category.update({
      where: { id },
      data,
      include: this.categoryInclude,
    });
  }

  async remove(id: string, actor: { id: string; role: string }) {
    const category = await this.findOne(id);
    if (actor.role !== 'SUPERADMIN' && category.ownerId !== actor.id) {
      throw new ForbiddenException('Category not authorized');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
