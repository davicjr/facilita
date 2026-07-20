import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { UpdateShortcutCatalogDto } from './dto/update-shortcut-catalog.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SystemConfigService } from './system-config.service';

@Controller('system-config')
@UseGuards(JwtAuthGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSystemConfig')
  findAll() {
    return this.systemConfigService.findAll();
  }

  @Get('shortcuts/catalog')
  findShortcutCatalog() {
    return this.systemConfigService.findShortcutCatalog();
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSystemConfig')
  findOne(@Param('key') key: string) {
    return this.systemConfigService.findOne(key);
  }

  @Patch('shortcuts/catalog')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSystemConfig')
  updateShortcutCatalog(@Body() data: UpdateShortcutCatalogDto) {
    return this.systemConfigService.updateShortcutCatalog(data.items);
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('canManageSystemConfig')
  update(@Param('key') key: string, @Body() data: UpdateSystemConfigDto) {
    return this.systemConfigService.update(key, data);
  }
}
