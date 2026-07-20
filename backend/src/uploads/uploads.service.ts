import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EntityStatus, Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { systemConfigStore } from '../system-config/system-config.store';
import { PrismaService } from '../prisma/prisma.service';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { QueryImagesDto } from './dto/query-images.dto';

const resolveUploadRoot = () => {
  const configured = systemConfigStore.getString('upload_directory', 'uploads');
  const value = configured.trim() || 'uploads';
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};

const isFullyResolvedPath = (filePath: string) => {
  // On Windows, path.isAbsolute('/foo') returns true (drive-relative),
  // but '/uploads/...' is a URL-style relative path that must be resolved
  // against the upload root. Only treat as already-resolved if it has a
  // drive letter (C:\...) or UNC prefix (\\...).
  return /^([a-zA-Z]:[/\\]|[/\\]{2})/.test(filePath);
};

const resolveUploadPath = (filePath: string) => {
  if (isFullyResolvedPath(filePath)) {
    return filePath;
  }
  const trimmed = filePath.replace(/^[/\\]+/, '');
  const root = resolveUploadRoot();
  if (trimmed.startsWith('uploads/') || trimmed.startsWith('uploads\\')) {
    return resolve(root, trimmed.slice('uploads/'.length));
  }
  return resolve(root, trimmed);
};

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveStoredFilePath(filePath: string): string {
    return resolveUploadPath(filePath);
  }

  private async getImageUsageCounts(imageUrls: string[]) {
    const uniqueImageUrls = [...new Set(imageUrls.filter(Boolean))];

    if (uniqueImageUrls.length === 0) {
      return new Map<string, number>();
    }

    const [noteUsage, linkUsage, scheduleUsage] = await Promise.all([
      this.prisma.note.groupBy({
        by: ['imageUrl'],
        where: {
          imageUrl: { in: uniqueImageUrls },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      this.prisma.link.groupBy({
        by: ['imageUrl'],
        where: {
          imageUrl: { in: uniqueImageUrls },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      this.prisma.uploadedSchedule.groupBy({
        by: ['imageUrl'],
        where: {
          imageUrl: { in: uniqueImageUrls },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    ]);

    const usageCounts = new Map<string, number>();
    const appendCounts = (items: Array<{ imageUrl: string | null; _count: { _all: number } }>) => {
      items.forEach((item) => {
        if (!item.imageUrl) {
          return;
        }

        usageCounts.set(item.imageUrl, (usageCounts.get(item.imageUrl) ?? 0) + item._count._all);
      });
    };

    appendCounts(noteUsage);
    appendCounts(linkUsage);
    appendCounts(scheduleUsage);

    return usageCounts;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = resolveUploadPath(filePath);
      await unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  getFileUrl(filename: string, type: 'images' | 'documents' = 'documents'): string {
    return `/uploads/${type}/${filename}`;
  }

  async createImageRecord(dto: CreateImageDto) {
    return this.prisma.uploadedImage.create({
      data: {
        uploadedBy: dto.uploadedBy,
        filename: dto.filename,
        originalName: dto.originalName,
        url: dto.url,
        mimeType: dto.mimeType,
        size: dto.size,
        width: dto.width,
        height: dto.height,
        alt: dto.alt,
        tags: dto.tags || [],
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async listImages(query: QueryImagesDto) {
    const { uploadedBy, search, tags, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UploadedImageWhereInput = {
      status: EntityStatus.ACTIVE,
      deletedAt: null,
    };

    if (uploadedBy) {
      where.uploadedBy = uploadedBy;
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
        { alt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const [images, total] = await Promise.all([
      this.prisma.uploadedImage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.uploadedImage.count({ where }),
    ]);

    const usageCounts = await this.getImageUsageCounts(images.map((image) => image.url));

    return {
      data: images.map((image) => ({
        ...image,
        usageCount: usageCounts.get(image.url) ?? 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getImageById(id: string) {
    const image = await this.prisma.uploadedImage.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException('Imagem não encontrada');
    }

    const usageCount = await this.getImageUsageCount(image.url);

    return {
      ...image,
      usageCount,
    };
  }

  async updateImage(id: string, dto: UpdateImageDto) {
    const image = await this.prisma.uploadedImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Imagem não encontrada');
    }

    return this.prisma.uploadedImage.update({
      where: { id },
      data: {
        alt: dto.alt,
        tags: dto.tags,
      },
    });
  }

  async deleteImage(id: string) {
    const image = await this.prisma.uploadedImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Imagem não encontrada');
    }

    const canDelete = await this.canDeleteImage(image.url);

    if (!canDelete) {
      const usageCount = await this.getImageUsageCount(image.url);
      throw new ConflictException(
        `Não é possível deletar esta imagem. Ela está sendo usada em ${usageCount} lugar(es).`,
      );
    }

    await this.prisma.uploadedImage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.deleteFile(image.url);

    return { message: 'Imagem deletada com sucesso' };
  }

  async getImageUsageCount(imageUrl: string): Promise<number> {
    const [notesCount, linksCount, schedulesCount] = await Promise.all([
      this.prisma.note.count({
        where: {
          imageUrl,
          deletedAt: null,
        },
      }),
      this.prisma.link.count({
        where: {
          imageUrl,
          deletedAt: null,
        },
      }),
      this.prisma.uploadedSchedule.count({
        where: {
          imageUrl,
          deletedAt: null,
        },
      }),
    ]);

    return notesCount + linksCount + schedulesCount;
  }

  async canDeleteImage(imageUrl: string): Promise<boolean> {
    const count = await this.getImageUsageCount(imageUrl);
    return count === 0;
  }
}
