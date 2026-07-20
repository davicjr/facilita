import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { AppModule } from './app.module';
import { buildCorsOptions } from './common/utils/cors';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SystemConfigService } from './system-config/system-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const systemConfigService = app.get(SystemConfigService);

  // Avoid 304 responses for API payloads (frontend treats them as errors).
  app.disable('etag');

  await systemConfigService.syncStore();

  // Create upload directories if they don't exist
  const uploadRoot = systemConfigService.resolvePath(
    'upload_directory',
    'uploads',
  );
  const uploadDirs = [
    uploadRoot,
    join(uploadRoot, 'images'),
    join(uploadRoot, 'documents'),
  ];
  for (const dir of uploadDirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  // Serve static files (allowing dynamic upload directory changes)
  app.use('/uploads', (req: any, res: any, next: any) => {
    const root = systemConfigService.resolvePath(
      'upload_directory',
      'uploads',
    );
    return express.static(root)(req, res, next);
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigin = config.get<string>('CORS_ORIGIN');
  const nodeEnv = config.get<string>('NODE_ENV');

  app.enableCors(buildCorsOptions(corsOrigin, nodeEnv));

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
