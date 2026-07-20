import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('ownerId') ownerId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const isSuperAdmin = req.user?.role === UserRole.SUPERADMIN;
    return this.categoriesService.findAll({
      ownerId: isSuperAdmin ? ownerId : req.user?.id,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageCategories')
  create(@Request() req: any, @Body() data: CreateCategoryDto) {
    return this.categoriesService.create(req.user.id, data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageCategories')
  update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, req.user, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageCategories')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.categoriesService.remove(id, req.user);
  }
}
