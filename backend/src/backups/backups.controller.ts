import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { execFile } from 'child_process';
import { createReadStream, mkdirSync } from 'fs';
import { mkdir, readdir, stat } from 'fs/promises';
import { diskStorage } from 'multer';
import { join, resolve, sep } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SystemConfigService } from '../system-config/system-config.service';
import { BackupsService } from './backups.service';
import { ExportBackupDto } from './dto/export-backup.dto';
import { BackupEntity, BackupPayload, backupEntities } from './backups.types';

const backupUploadDir = join(process.cwd(), 'backups', 'tmp');
const backupStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(backupUploadDir, { recursive: true });
    cb(null, backupUploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

@Controller('backups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('canBackupSystem')
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  @Get('auto')
  async listAutoBackups() {
    const directory = this.resolveAutoBackupDir();

    try {
      const entries = await readdir(directory);
      const files = await Promise.all(
        entries.map(async (name) => {
          try {
            const filePath = join(directory, name);
            const info = await stat(filePath);
            if (!info.isFile()) return null;
            return {
              name,
              size: info.size,
              updatedAt: info.mtime.toISOString(),
            };
          } catch {
            return null;
          }
        }),
      );

      return {
        directory,
        files: files
          .filter((file): file is NonNullable<typeof file> => Boolean(file))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      };
    } catch {
      return { directory, files: [] };
    }
  }

  @Post('auto/open')
  async openAutoBackups() {
    const directory = this.resolveAutoBackupDir();
    await mkdir(directory, { recursive: true });

    const platform = process.platform;
    const command =
      platform === 'win32'
        ? 'explorer.exe'
        : platform === 'darwin'
        ? 'open'
        : 'xdg-open';

    try {
      await new Promise<void>((resolvePromise, reject) => {
        const child = execFile(command, [directory], (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolvePromise();
        });
        child.on('error', reject);
      });
      return { opened: true, directory };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      return {
        opened: false,
        directory,
        reason: code === 'ENOENT' ? 'not_supported' : 'failed',
      };
    }
  }

  @Get('auto/files/:name')
  async downloadAutoBackup(
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      throw new BadRequestException('Arquivo invalido.');
    }

    const directory = this.resolveAutoBackupDir();
    const resolvedDir = resolve(directory);
    const filePath = resolve(directory, name);

    if (!filePath.startsWith(resolvedDir + sep)) {
      throw new BadRequestException('Arquivo invalido.');
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      throw new NotFoundException('Arquivo nao encontrado.');
    }

    if (!info.isFile()) {
      throw new NotFoundException('Arquivo nao encontrado.');
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${name}"`,
    });
    return new StreamableFile(createReadStream(filePath));
  }

  @Post('export')
  async export(
    @Body() data: ExportBackupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const archive = await this.backupsService.exportArchive(data.entities);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${archive.filename}"`,
    });
    return new StreamableFile(archive.stream);
  }

  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: backupStorage,
      limits: { fileSize: 200 * 1024 * 1024 },
    }),
  )
  async restore(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const entities = this.parseEntities(body.entities);
    const mode = body.mode === 'merge' ? 'merge' : 'merge';

    if (file?.path) {
      return this.backupsService.restoreFromArchive(file.path, entities, mode);
    }

    if (body.backup) {
      const payload = this.parsePayload(body.backup);
      return this.backupsService.restore(payload, entities, mode);
    }

    throw new BadRequestException('Arquivo de backup ausente.');
  }

  private parseEntities(input: unknown): BackupEntity[] | undefined {
    if (!input) {
      return undefined;
    }

    const allowed = new Set(backupEntities);
    const normalize = (values: unknown[]) =>
      values.filter(
        (value): value is BackupEntity =>
          typeof value === 'string' && allowed.has(value as BackupEntity),
      );

    if (Array.isArray(input)) {
      return normalize(input);
    }

    if (typeof input === 'string') {
      try {
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) {
          return normalize(parsed);
        }
      } catch {
        // ignore parse error and fallback to csv
      }

      const csvValues = input
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      return normalize(csvValues);
    }

    return undefined;
  }

  private parsePayload(input: unknown): BackupPayload {
    if (typeof input === 'object' && input !== null) {
      return input as BackupPayload;
    }

    if (typeof input === 'string') {
      try {
        return JSON.parse(input) as BackupPayload;
      } catch {
        throw new BadRequestException('Backup invalido.');
      }
    }

    throw new BadRequestException('Backup invalido.');
  }

  private resolveAutoBackupDir() {
    return this.systemConfigService.resolvePath(
      'backup_directory',
      'backups/auto',
    );
  }
}
