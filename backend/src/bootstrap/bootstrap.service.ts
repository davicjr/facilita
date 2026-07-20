import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { defaultRolePermissions } from '../permissions/permissions.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  INITIAL_SUPERADMIN_BOOTSTRAP_KEY,
  SYSTEM_CONFIG_DEFAULTS,
} from '../system-config/system-config.defaults';
import { systemConfigStore } from '../system-config/system-config.store';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureBootstrapData();
    } catch (error) {
      this.logger.error('Failed to bootstrap initial data.', error as Error);
    }
  }

  private async ensureBootstrapData() {
    await this.ensureRolePermissions();
    await this.ensureSystemConfig();
    await this.ensureInitialSuperAdmin();
  }

  private async ensureRolePermissions() {
    const roles = [
      {
        role: UserRole.USER,
        ...defaultRolePermissions[UserRole.USER],
      },
      {
        role: UserRole.SUPERADMIN,
        ...defaultRolePermissions[UserRole.SUPERADMIN],
      },
    ];

    const existing = await this.prisma.rolePermission.findMany({
      select: { role: true },
    });
    const existingRoles = new Set(existing.map((item) => item.role));

    for (const rolePermission of roles) {
      if (existingRoles.has(rolePermission.role)) {
        continue;
      }

      await this.prisma.rolePermission.create({
        data: rolePermission,
      });
    }
  }

  private async ensureInitialSuperAdmin() {
    const state = await this.prisma.systemConfig.findUnique({
      where: { key: INITIAL_SUPERADMIN_BOOTSTRAP_KEY },
      select: { value: true },
    });

    if (state?.value === 'true') {
      return;
    }

    const usersCount = await this.prisma.user.count();
    if (usersCount > 0) {
      await this.markInitialSuperAdminBootstrapped();
      return;
    }

    const email =
      this.config.get<string>('SUPERADMIN_EMAIL')?.trim() || 'superadmin@facilita.local';
    const password =
      this.config.get<string>('SUPERADMIN_PASSWORD')?.trim() || 'superadmin';
    const name =
      this.config.get<string>('SUPERADMIN_NAME')?.trim() || 'Superadmin';
    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction(async (tx) => {
      const currentState = await tx.systemConfig.findUnique({
        where: { key: INITIAL_SUPERADMIN_BOOTSTRAP_KEY },
        select: { value: true },
      });

      if (currentState?.value === 'true') {
        return;
      }

      const currentUsersCount = await tx.user.count();
      if (currentUsersCount > 0) {
        await this.markInitialSuperAdminBootstrapped(tx);
        return;
      }

      await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: UserRole.SUPERADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      await this.markInitialSuperAdminBootstrapped(tx);
    });

    this.logger.log(`Initial superadmin created with email: ${email}`);
  }

  private async ensureSystemConfig() {
    const existing = await this.prisma.systemConfig.findMany({
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((entry) => entry.key));

    for (const entry of SYSTEM_CONFIG_DEFAULTS) {
      if (existingKeys.has(entry.key)) {
        continue;
      }

      await this.prisma.systemConfig.create({
        data: entry,
      });
      systemConfigStore.set(entry.key, entry.value);
    }
  }

  private async markInitialSuperAdminBootstrapped(
    prisma: Pick<PrismaService, 'systemConfig'> = this.prisma,
  ) {
    await prisma.systemConfig.upsert({
      where: { key: INITIAL_SUPERADMIN_BOOTSTRAP_KEY },
      update: { value: 'true' },
      create: {
        key: INITIAL_SUPERADMIN_BOOTSTRAP_KEY,
        value: 'true',
        description: 'Indica se o superadmin inicial ja foi provisionado.',
        type: 'boolean',
        isEditable: false,
        category: 'system',
      },
    });
    systemConfigStore.set(INITIAL_SUPERADMIN_BOOTSTRAP_KEY, 'true');
  }
}
