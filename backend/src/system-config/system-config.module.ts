import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
