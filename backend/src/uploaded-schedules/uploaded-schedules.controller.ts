import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EntityStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { parsePagination } from '../common/utils/pagination';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UploadedSchedulesService } from './uploaded-schedules.service';
import { UploadsService } from '../uploads/uploads.service';

@Controller('schedules')
export class UploadedSchedulesController {
  constructor(
    private readonly schedulesService: UploadedSchedulesService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  create(@Body() dto: CreateScheduleDto, @Request() req: any) {
    return this.schedulesService.create(req.user, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Request() req?: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.schedulesService.findAll(req?.user, {
      categoryId,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.SUPERADMIN)
  @Permissions('canViewSchedules')
  async findAllAdmin(
    @Request() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const pagination = parsePagination(page, pageSize, {
      defaultPageSize: 12,
    });

    const { items, total } = await this.schedulesService.findAllPaginated(
      {
        categoryId,
        search,
        includeInactive: includeInactive === 'true',
      },
      pagination.shouldPaginate
        ? { skip: pagination.skip, take: pagination.take }
        : undefined,
    );

    if (pagination.shouldPaginate && res) {
      res.setHeader('X-Total-Count', total.toString());
    }

    return items;
  }

  @Get(':id/download')
  @UseGuards(OptionalJwtAuthGuard)
  async download(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const item = await this.schedulesService.getDownloadInfo(id, req?.user);
    const filePath = this.uploadsService.resolveStoredFilePath(item.fileUrl);
    return res.download(filePath, item.fileName);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.schedulesService.findOne(id, req?.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.update(id, req.user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.remove(id, req.user);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.restore(id, req.user);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  activate(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.setStatus(id, req.user, EntityStatus.ACTIVE);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSchedules')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.schedulesService.setStatus(id, req.user, EntityStatus.INACTIVE);
  }
}
