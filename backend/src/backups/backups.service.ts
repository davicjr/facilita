import { BadRequestException, Injectable } from '@nestjs/common';
import * as archiver from 'archiver';
import { createWriteStream } from 'fs';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { resolve, isAbsolute } from 'path';
import { PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import * as unzipper from 'unzipper';
import { PrismaService } from '../prisma/prisma.service';
import { BackupEntity, BackupPayload, backupEntities } from './backups.types';

type BackupArchive = {
  stream: PassThrough;
  filename: string;
};

@Injectable()
export class BackupsService {
  constructor(private readonly prisma: PrismaService) {}

  async export(entities: BackupEntity[]): Promise<BackupPayload> {
    const selected = entities.filter((entity) => backupEntities.includes(entity));
    const data: BackupPayload['data'] = {};

    for (const entity of selected) {
      switch (entity) {
        case 'users':
          data.users = await this.prisma.user.findMany();
          break;
        case 'rolePermissions':
          data.rolePermissions = await this.prisma.rolePermission.findMany();
          break;
        case 'categories':
          data.categories = await this.prisma.category.findMany();
          break;
        case 'links':
          data.links = await this.prisma.link.findMany();
          break;
        case 'uploadedSchedules':
          data.uploadedSchedules = await this.prisma.uploadedSchedule.findMany();
          break;
        case 'notes':
          data.notes = await this.prisma.note.findMany();
          break;
        case 'uploadedImages':
          data.uploadedImages = await this.prisma.uploadedImage.findMany();
          break;
        case 'shares':
          data.shares = await this.prisma.share.findMany();
          break;
        case 'favorites':
          data.favorites = await this.prisma.favorite.findMany();
          break;
        case 'notifications':
          data.notifications = await this.prisma.notification.findMany();
          break;
        case 'systemConfig':
          data.systemConfig = await this.prisma.systemConfig.findMany();
          break;
        default:
          break;
      }
    }

    return {
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        entities: selected,
      },
      data,
    };
  }

  async exportArchive(entities: BackupEntity[]): Promise<BackupArchive> {
    const payload = await this.export(entities);
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        return;
      }
      stream.destroy(err);
    });
    archive.on('error', (err) => stream.destroy(err));

    archive.pipe(stream);
    archive.append(JSON.stringify(payload, null, 2), { name: 'backup.json' });

    void archive.finalize();

    const date = new Date().toISOString().slice(0, 10);
    return {
      stream,
      filename: `facilita-backup-${date}.zip`,
    };
  }

  async exportArchiveToFile(
    entities: BackupEntity[],
    targetDir: string,
    prefix = 'facilita-backup',
  ) {
    const resolvedDir = isAbsolute(targetDir)
      ? targetDir
      : resolve(process.cwd(), targetDir);
    await mkdir(resolvedDir, { recursive: true });

    const archive = await this.exportArchive(entities);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}-${timestamp}.zip`;
    const filePath = resolve(resolvedDir, filename);

    await pipeline(archive.stream, createWriteStream(filePath));
    return { path: filePath, filename };
  }

  async restore(
    payload: BackupPayload,
    entities?: BackupEntity[],
    mode: 'merge' = 'merge',
  ) {
    if (mode !== 'merge') {
      return { restored: {}, skipped: backupEntities };
    }

    const selected = (entities && entities.length > 0
      ? entities
      : payload.meta?.entities || [])
      .filter((entity) => backupEntities.includes(entity));

    const restored: Partial<Record<BackupEntity, number>> = {};

    await this.prisma.$transaction(async (tx) => {
      for (const entity of selected) {
        const rawItems = payload.data?.[entity];
        const items = Array.isArray(rawItems) ? rawItems : [];

        switch (entity) {
          case 'users':
            restored.users = await this.upsertById(tx.user, items as any[]);
            break;
          case 'rolePermissions':
            restored.rolePermissions = await this.upsertByRole(
              tx.rolePermission,
              items as any[],
            );
            break;
          case 'categories':
            restored.categories = await this.upsertById(tx.category, items as any[]);
            break;
          case 'links':
            restored.links = await this.upsertById(tx.link, items as any[]);
            break;
          case 'uploadedSchedules':
            restored.uploadedSchedules = await this.upsertById(
              tx.uploadedSchedule,
              items as any[],
            );
            break;
          case 'notes':
            restored.notes = await this.upsertById(tx.note, items as any[]);
            break;
          case 'uploadedImages':
            restored.uploadedImages = await this.upsertById(
              tx.uploadedImage,
              items as any[],
            );
            break;
          case 'shares':
            restored.shares = await this.upsertById(tx.share, items as any[]);
            break;
          case 'favorites':
            restored.favorites = await this.upsertById(tx.favorite, items as any[]);
            break;
          case 'notifications':
            restored.notifications = await this.upsertById(
              tx.notification,
              items as any[],
            );
            break;
          case 'systemConfig':
            restored.systemConfig = await this.upsertByKey(
              tx.systemConfig,
              items as any[],
            );
            break;
          default:
            break;
        }
      }
    });

    return { restored };
  }

  async restoreFromArchive(
    filePath: string,
    entities?: BackupEntity[],
    mode: 'merge' = 'merge',
  ) {
    try {
      const directory = await unzipper.Open.file(filePath);
      const backupEntry = directory.files.find(
        (entry) => entry.path === 'backup.json',
      );

      if (!backupEntry) {
        throw new BadRequestException(
          'Arquivo de backup invalido: backup.json ausente.',
        );
      }

      let payload: BackupPayload;
      try {
        const raw = await backupEntry.buffer();
        payload = JSON.parse(raw.toString('utf-8')) as BackupPayload;
      } catch {
        throw new BadRequestException(
          'Arquivo de backup invalido: JSON corrompido.',
        );
      }

      return this.restore(payload, entities, mode);
    } finally {
      try {
        await unlink(filePath);
      } catch {
        // ignore
      }
    }
  }

  async cleanupOldBackups(directory: string, retentionDays: number) {
    if (retentionDays <= 0) return 0;

    const resolvedDir = isAbsolute(directory)
      ? directory
      : resolve(process.cwd(), directory);

    try {
      const files = await readdir(resolvedDir);
      const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      let deleted = 0;

      for (const name of files) {
        const path = resolve(resolvedDir, name);
        try {
          const fileStat = await stat(path);
          if (!fileStat.isFile()) continue;
          if (fileStat.mtime.getTime() >= cutoff) continue;
          await unlink(path);
          deleted += 1;
        } catch {
          // ignore individual failures
        }
      }

      return deleted;
    } catch {
      return 0;
    }
  }

  private async upsertById(model: any, items: any[]) {
    for (const item of items) {
      const { id, ...rest } = item as Record<string, unknown>;
      if (!id || typeof id !== 'string') continue;
      await model.upsert({
        where: { id },
        update: rest,
        create: item as Record<string, unknown>,
      });
    }

    return items.length;
  }

  private async upsertByRole(model: any, items: any[]) {
    for (const item of items) {
      const role = (item as Record<string, unknown>).role;
      if (!role || typeof role !== 'string') continue;
      const { role: _, ...rest } = item as Record<string, unknown>;
      await model.upsert({
        where: { role },
        update: rest,
        create: item as Record<string, unknown>,
      });
    }

    return items.length;
  }

  private async upsertByKey(model: any, items: any[]) {
    for (const item of items) {
      const key = (item as Record<string, unknown>).key;
      if (!key || typeof key !== 'string') continue;
      const { key: _, ...rest } = item as Record<string, unknown>;
      await model.upsert({
        where: { key },
        update: rest,
        create: item as Record<string, unknown>,
      });
    }

    return items.length;
  }
}
