import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import {
  defaultRolePermissions,
  permissionKeys,
  type PermissionFlags,
  type PermissionKey,
} from './permissions.constants';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeFlags<T extends object>(data: T): T {
    const flags = data as T & Partial<PermissionFlags>;

    if (flags.canCreateUsers || flags.canEditUsers || flags.canDeleteUsers) {
      flags.canViewUsers = true;
    }

    if (flags.canManageCategories) {
      flags.canViewCategories = true;
    }

    if (flags.canManageLinks) {
      flags.canViewLinks = true;
    }

    if (flags.canManageSchedules) {
      flags.canViewSchedules = true;
    }

    if (flags.canManageNotes) {
      flags.canViewNotes = true;
    }

    if (flags.canManageImages) {
      flags.canViewImages = true;
    }

    if (flags.canManageShares) {
      flags.canViewSharesPage = true;
    }

    return flags;
  }

  getRolePermission(role: UserRole) {
    return this.prisma.rolePermission.findUnique({ where: { role } });
  }

  async getResolvedRolePermissions(role: UserRole): Promise<PermissionFlags> {
    const stored = await this.getRolePermission(role);
    const fallback = defaultRolePermissions[role];

    if (!stored) {
      return fallback;
    }

    const resolved = permissionKeys.reduce<PermissionFlags>((acc, key) => {
      acc[key] = Boolean(stored[key] ?? fallback[key]);
      return acc;
    }, {} as PermissionFlags);

    return this.normalizeFlags(resolved);
  }

  async findAll() {
    const rows = await this.prisma.rolePermission.findMany({
      orderBy: { role: 'asc' },
    });

    return rows.map((row) => this.normalizeFlags(row));
  }

  async hasPermissions(role: UserRole, permissions: PermissionKey[]): Promise<boolean> {
    const flags = await this.getResolvedRolePermissions(role);
    return permissions.every((permission) => flags[permission] === true);
  }

  async updateRolePermissions(
    role: UserRole,
    data: UpdateRolePermissionDto,
  ) {
    const constrainedData = this.normalizeFlags(data);

    return this.prisma.rolePermission.upsert({
      where: { role },
      update: constrainedData,
      create: {
        role,
        ...constrainedData,
      },
    });
  }
}
