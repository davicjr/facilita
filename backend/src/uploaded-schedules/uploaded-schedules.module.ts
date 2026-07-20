import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UploadedSchedulesController } from './uploaded-schedules.controller';
import { UploadedSchedulesService } from './uploaded-schedules.service';

@Module({
  imports: [PrismaModule, CommonModule, UploadsModule],
  controllers: [UploadedSchedulesController],
  providers: [UploadedSchedulesService],
  exports: [UploadedSchedulesService],
})
export class UploadedSchedulesModule {}
