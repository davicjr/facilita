import 'dotenv/config';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createPrismaAdapter } from '../src/prisma/prisma-adapter';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const email = 'admin';
  const password = 'admin123';
  const name = 'Admin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists:', existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Admin user created:', user.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });