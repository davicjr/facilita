import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EntityType, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { PermissionFlags } from '../permissions/permissions.constants';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareLocalCategoryDto } from './dto/update-share-local-category.dto';
import { SharesService } from './shares.service';

type ShareCurrentUser = {
  id: string;
  role: UserRole;
  permissions?: PermissionFlags | null;
};

@Controller('shares')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.USER)
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.SUPERADMIN)
  @Permissions('canManageShares')
  create(
    @CurrentUser() user: ShareCurrentUser,
    @Body() dto: CreateShareDto,
  ) {
    return this.sharesService.create(user, dto);
  }

  @Get('received')
  @Permissions('canViewSharesPage')
  findReceived(
    @CurrentUser() user: ShareCurrentUser,
    @Query('type', new ParseEnumPipe(EntityType, { optional: true }))
    type?: EntityType,
  ) {
    return this.sharesService.findReceived(user, type);
  }

  @Get('pending')
  @Permissions('canViewSharesPage')
  findPending(
    @CurrentUser() user: ShareCurrentUser,
    @Query('type', new ParseEnumPipe(EntityType, { optional: true }))
    type?: EntityType,
  ) {
    return this.sharesService.findPending(user, type);
  }

  @Get('sent')
  @Permissions('canViewSharesPage')
  findSent(
    @CurrentUser() user: ShareCurrentUser,
    @Query('type', new ParseEnumPipe(EntityType, { optional: true }))
    type?: EntityType,
  ) {
    return this.sharesService.findSent(user, type);
  }

  @Patch(':id/approve')
  @Permissions('canManageShares')
  approve(
    @CurrentUser() user: ShareCurrentUser,
    @Param('id') id: string,
  ) {
    return this.sharesService.approve(user, id);
  }

  @Delete(':id/reject')
  @Permissions('canManageShares')
  reject(
    @CurrentUser() user: ShareCurrentUser,
    @Param('id') id: string,
  ) {
    return this.sharesService.reject(user, id);
  }

  @Get('recipients')
  @Roles(UserRole.USER, UserRole.SUPERADMIN)
  @Permissions('canManageShares')
  findRecipients(
    @CurrentUser() user: ShareCurrentUser,
    @Query('entityType', new ParseEnumPipe(EntityType, { optional: true }))
    entityType?: EntityType,
    @Query('entityId') entityId?: string,
  ) {
    return this.sharesService.findRecipientsForEntity(user, entityType, entityId);
  }

  @Patch(':id/local-category')
  @Permissions('canManageShares')
  updateLocalCategory(
    @CurrentUser() user: ShareCurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateShareLocalCategoryDto,
  ) {
    return this.sharesService.updateLocalCategory(user, id, dto);
  }

  @Delete(':id/remove')
  @Permissions('canManageShares')
  removeReceived(
    @CurrentUser() user: ShareCurrentUser,
    @Param('id') id: string,
  ) {
    return this.sharesService.removeReceived(user, id);
  }

  @Delete(':id/revoke')
  @Permissions('canManageShares')
  revoke(
    @CurrentUser() user: ShareCurrentUser,
    @Param('id') id: string,
  ) {
    return this.sharesService.revoke(user, id);
  }
}
