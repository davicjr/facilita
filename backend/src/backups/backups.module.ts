import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { BackupsController } from './backups.controller';
import { BackupSchedulerService } from './backup-scheduler.service';
import { BackupsService } from './backups.service';

@Module({
  imports: [PrismaModule, SystemConfigModule, CommonModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupSchedulerService],
})
export class BackupsModule {}
