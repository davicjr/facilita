import {
  ForbiddenException,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Param,
  Query,
  Body,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UploadsService } from './uploads.service';
import { imageMulterConfig, documentMulterConfig } from './config/multer.config';
import { imageFileFilter, documentFileFilter } from './filters/file-type.filter';
import { QueryImagesDto } from './dto/query-images.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { normalizeUploadedFilename } from './utils/filename.util';

function canUseImageLibrary(user: {
  role?: UserRole;
  permissions?: {
    canViewImages?: boolean;
    canManageImages?: boolean;
    canManageLinks?: boolean;
    canManageSchedules?: boolean;
    canManageNotes?: boolean;
  } | null;
}) {
  if (user.role === UserRole.SUPERADMIN) {
    return true;
  }

  return Boolean(
    user.permissions?.canViewImages ||
      user.permissions?.canManageImages ||
      user.permissions?.canManageLinks ||
      user.permissions?.canManageSchedules ||
      user.permissions?.canManageNotes,
  );
}

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      ...imageMulterConfig,
      fileFilter: imageFileFilter,
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const originalName = normalizeUploadedFilename(file.originalname);
    const url = this.uploadsService.getFileUrl(file.filename, 'images');

    const image = await this.uploadsService.createImageRecord({
      uploadedBy: req.user.id,
      filename: file.filename,
      originalName,
      url,
      mimeType: file.mimetype,
      size: file.size,
    });

    return image;
  }

  @Get('images')
  @UseGuards(JwtAuthGuard)
  async listImages(@Query() query: QueryImagesDto, @Req() req: any) {
    if (!canUseImageLibrary(req.user)) {
      throw new ForbiddenException('Access denied');
    }

    if (req.user.role !== UserRole.SUPERADMIN) {
      query.uploadedBy = req.user.id;
    }

    return this.uploadsService.listImages(query);
  }

  @Get('images/:id')
  @UseGuards(JwtAuthGuard)
  async getImage(@Param('id') id: string, @Req() req: any) {
    if (!canUseImageLibrary(req.user)) {
      throw new ForbiddenException('Access denied');
    }

    return this.uploadsService.getImageById(id);
  }

  @Patch('images/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageImages')
  async updateImage(@Param('id') id: string, @Body() dto: UpdateImageDto) {
    return this.uploadsService.updateImage(id, dto);
  }

  @Delete('images/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageImages')
  async deleteImage(@Param('id') id: string) {
    return this.uploadsService.deleteImage(id);
  }

  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      ...documentMulterConfig,
      fileFilter: documentFileFilter,
    }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const originalName = normalizeUploadedFilename(file.originalname);

    return {
      filename: file.filename,
      originalName,
      size: file.size,
      url: this.uploadsService.getFileUrl(file.filename, 'documents'),
    };
  }
}
