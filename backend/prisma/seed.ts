import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { defaultRolePermissions } from '../src/permissions/permissions.constants';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';
import {
  INITIAL_SUPERADMIN_BOOTSTRAP_KEY,
  SYSTEM_CONFIG_DEFAULTS,
} from '../src/system-config/system-config.defaults';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function seedRolePermissions() {
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

  for (const rolePermission of roles) {
    await prisma.rolePermission.upsert({
      where: { role: rolePermission.role },
      update: rolePermission,
      create: rolePermission,
    });
  }
}

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@facilita.local';
  const password = process.env.SUPERADMIN_PASSWORD || 'superadmin';
  const name = process.env.SUPERADMIN_NAME || 'Superadmin';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
    },
  });

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
}

async function seedSystemConfig() {
  for (const entry of SYSTEM_CONFIG_DEFAULTS) {
    await prisma.systemConfig.upsert({
      where: { key: entry.key },
      update: {
        description: entry.description,
        type: entry.type,
        isEditable: entry.isEditable,
        category: entry.category,
      },
      create: entry,
    });
  }
}

async function main() {
  await seedRolePermissions();
  await seedSuperAdmin();
  await seedSystemConfig();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
