import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let pool: Pool | null = null;

export function createPrismaAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return new PrismaPg(pool);
}
