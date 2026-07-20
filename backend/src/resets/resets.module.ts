import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ResetsController } from './resets.controller';
import { ResetsService } from './resets.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ResetsController],
  providers: [ResetsService],
})
export class ResetsModule {}
