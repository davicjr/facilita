import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts',
  },
});
