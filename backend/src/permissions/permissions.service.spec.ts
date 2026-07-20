import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from './permissions.service';
import { permissionKeys } from './permissions.constants';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prisma: {
    rolePermission: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      rolePermission: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PermissionsService);
  });

  describe('canAccessAdmin removido', () => {
    it('não existe mais entre as permissionKeys', () => {
      expect(permissionKeys).not.toContain('canAccessAdmin');
    });
  });

  describe('getResolvedRolePermissions', () => {
    it('usa o default da role quando não há RolePermission salvo', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      const flags = await service.getResolvedRolePermissions(UserRole.USER);

      expect(flags.canViewHome).toBe(true);
      expect(flags.canBackupSystem).toBe(false);
    });

    it('sobrepõe o default com o que está salvo, chave a chave', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue({
        role: UserRole.USER,
        canViewHome: false,
        canBackupSystem: true,
      });

      const flags = await service.getResolvedRolePermissions(UserRole.USER);

      expect(flags.canViewHome).toBe(false);
      expect(flags.canBackupSystem).toBe(true);
      // Chaves não presentes no registro salvo continuam caindo no default.
      expect(flags.canViewFavorites).toBe(true);
    });

    it('não força mais canAccessAdmin=true para SUPERADMIN (flag não existe mais)', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue({
        role: UserRole.SUPERADMIN,
        canBackupSystem: false,
      });

      const flags = await service.getResolvedRolePermissions(UserRole.SUPERADMIN);

      expect(flags.canBackupSystem).toBe(false);
      expect((flags as Record<string, unknown>).canAccessAdmin).toBeUndefined();
    });
  });

  describe('normalizeFlags (via cascatas de canManageX)', () => {
    it('canManageLinks implica canViewLinks mesmo se canViewLinks vier false', async () => {
      prisma.rolePermission.upsert.mockImplementation(({ update }) => update);

      const result = await service.updateRolePermissions(UserRole.USER, {
        canManageLinks: true,
        canViewLinks: false,
      } as never);

      expect(result.canManageLinks).toBe(true);
      expect(result.canViewLinks).toBe(true);
    });

    it('canManageShares implica canViewSharesPage', async () => {
      prisma.rolePermission.upsert.mockImplementation(({ update }) => update);

      const result = await service.updateRolePermissions(UserRole.USER, {
        canManageShares: true,
      } as never);

      expect(result.canViewSharesPage).toBe(true);
    });

    it('não força mais canAccessAdmin=true para SUPERADMIN ao salvar (comportamento antigo removido)', async () => {
      prisma.rolePermission.upsert.mockImplementation(({ update }) => update);

      const result = await service.updateRolePermissions(UserRole.SUPERADMIN, {
        canBackupSystem: false,
      } as never);

      expect((result as Record<string, unknown>).canAccessAdmin).toBeUndefined();
    });
  });

  describe('hasPermissions', () => {
    it('retorna true só quando TODAS as permissões pedidas estão presentes', async () => {
      prisma.rolePermission.findUnique.mockResolvedValue(null);

      const allGranted = await service.hasPermissions(UserRole.SUPERADMIN, [
        'canViewHome',
        'canBackupSystem',
      ]);
      const partiallyGranted = await service.hasPermissions(UserRole.USER, [
        'canViewHome',
        'canBackupSystem',
      ]);

      expect(allGranted).toBe(true);
      expect(partiallyGranted).toBe(false);
    });
  });
});
