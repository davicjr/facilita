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
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinksService } from './links.service';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  create(@Body() createLinkDto: CreateLinkDto, @Request() req: any) {
    return this.linksService.create(req.user, createLinkDto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Request() req?: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.linksService.findAll(req?.user, {
      categoryId,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.SUPERADMIN)
  @Permissions('canViewLinks')
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

    const { items, total } = await this.linksService.findAllPaginated(
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

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @Request() req?: any) {
    return this.linksService.findOne(id, req?.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  update(
    @Param('id') id: string,
    @Body() updateLinkDto: UpdateLinkDto,
    @Request() req: any,
  ) {
    return this.linksService.update(id, req.user, updateLinkDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.linksService.remove(id, req.user);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.linksService.restore(id, req.user);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  activate(@Param('id') id: string, @Request() req: any) {
    return this.linksService.setStatus(id, req.user, EntityStatus.ACTIVE);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageLinks')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.linksService.setStatus(id, req.user, EntityStatus.INACTIVE);
  }
}
