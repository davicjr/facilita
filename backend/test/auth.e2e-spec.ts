import { ValidationPipe, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Sobe a aplicação real (mesmos módulos do main.ts) contra um banco de teste
 * dedicado (DATABASE_URL apontando pra facilita_test). O BootstrapService
 * (OnModuleInit) já semeia o superadmin com SUPERADMIN_EMAIL/PASSWORD do
 * ambiente, então não precisa de fixtures manuais aqui.
 */
const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@facilita.local';
const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'ChangeMe123!';

async function createApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('Auth (e2e) — login', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login com credenciais corretas retorna user + accessToken e seta cookie de refresh', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: superadminEmail, password: superadminPassword });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(superadminEmail);
    expect(response.body.user.role).toBe('SUPERADMIN');
    expect(
      (response.headers['set-cookie'] as unknown as string[]).some((cookie: string) =>
        cookie.startsWith('refresh_token='),
      ),
    ).toBe(true);
  });

  it('POST /api/auth/login com senha errada retorna 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: superadminEmail, password: 'senha-errada-123' });

    expect(response.status).toBe(401);
  });

  it('POST /api/auth/login valida o payload (username < 3 chars é rejeitado)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'ab', password: 'senha-qualquer' });

    expect(response.status).toBe(400);
  });
});

describe('Auth (e2e) — rate limit', () => {
  // App isolada (ThrottlerStorage em memória própria) pra não herdar contagem
  // das requisições feitas no describe de login acima.
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloqueia com 429 a partir da 6ª tentativa de login no mesmo minuto (limite é 5)', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: superadminEmail, password: 'senha-errada-123' });

      expect(response.status).toBe(401);
    }

    const sixthAttempt = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: superadminEmail, password: 'senha-errada-123' });

    expect(sixthAttempt.status).toBe(429);
  });
});
