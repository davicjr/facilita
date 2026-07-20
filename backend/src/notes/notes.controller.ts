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
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  create(@Body() dto: CreateNoteDto, @Request() req: any) {
    return this.notesService.create(req.user, dto);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Request() req?: any,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.notesService.findAll(req?.user, {
      categoryId,
      search,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(UserRole.SUPERADMIN)
  @Permissions('canViewNotes')
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

    const { items, total } = await this.notesService.findAllPaginated(
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
    return this.notesService.findOne(id, req?.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Request() req: any,
  ) {
    return this.notesService.update(id, req.user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.notesService.remove(id, req.user);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.notesService.restore(id, req.user);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  activate(@Param('id') id: string, @Request() req: any) {
    return this.notesService.setStatus(id, req.user, EntityStatus.ACTIVE);
  }

  @Post(':id/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageNotes')
  deactivate(@Param('id') id: string, @Request() req: any) {
    return this.notesService.setStatus(id, req.user, EntityStatus.INACTIVE);
  }
}
