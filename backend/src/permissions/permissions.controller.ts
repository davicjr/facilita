import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Patch(':role')
  update(
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
    @Body() data: UpdateRolePermissionDto,
  ) {
    return this.permissionsService.updateRolePermissions(role, data);
  }
}
