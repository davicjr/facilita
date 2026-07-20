import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const status = {
      status: 'ok',
      database: 'down',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      status.database = 'up';
    } catch (error) {
      status.database = 'down';
    }

    return status;
  }
}