import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { ContentHelpersService } from './services/content-helpers.service';

@Module({
  imports: [PrismaModule, PermissionsModule],
  providers: [ContentHelpersService, RolesGuard, PermissionsGuard],
  exports: [PermissionsModule, ContentHelpersService, RolesGuard, PermissionsGuard],
})
export class CommonModule {}
