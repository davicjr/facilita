import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { backupEntities } from './backups.types';
import { BackupsService } from './backups.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private lastRunKey: string | null = null;
  private running = false;

  constructor(
    private readonly backupsService: BackupsService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick() {
    if (this.running) return;

    const enabled = this.systemConfigService.getBoolean(
      'backup_schedule_enabled',
      false,
    );
    const scheduleTime = this.systemConfigService.getString(
      'backup_schedule_time',
      '02:00',
    );
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Log apenas uma vez por hora para debug
    if (now.getMinutes() === 0) {
      console.log(
        `[BackupScheduler] Verificando: enabled=${enabled}, scheduleTime=${scheduleTime}, currentTime=${currentTime}, lastRunKey=${this.lastRunKey}`,
      );
    }

    if (!enabled) return;

    const scheduleMinutes = this.parseScheduleMinutes(scheduleTime);
    if (scheduleMinutes === null) {
      if (now.getMinutes() === 0) {
        console.warn(
          `[BackupScheduler] Horario invalido: "${scheduleTime}". Use HH:MM.`,
        );
      }
      return;
    }

    const runKey = now.toISOString().slice(0, 10);
    if (this.lastRunKey === runKey) return;
    if (currentMinutes < scheduleMinutes) return;

    this.running = true;
    console.log(`[BackupScheduler] Iniciando backup automatico...`);
    try {
      await this.runBackup();
      this.lastRunKey = runKey;
      console.log(`[BackupScheduler] Backup automatico concluido com sucesso.`);
    } catch (error) {
      console.error('[BackupScheduler] Falha ao executar backup automatico:', error);
    } finally {
      this.running = false;
    }
  }

  private parseScheduleMinutes(value: string) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const parts = normalized.split(':');
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
      return null;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    return hours * 60 + minutes;
  }

  private async runBackup() {
    const backupDir = this.systemConfigService.resolvePath(
      'backup_directory',
      'backups/auto',
    );
    const retentionDays = this.systemConfigService.getNumber(
      'backup_retention_days',
      7,
    );

    console.log(`[BackupScheduler] Diretorio: ${backupDir}, Retencao: ${retentionDays} dias`);

    const result = await this.backupsService.exportArchiveToFile(
      [...backupEntities],
      backupDir,
      'facilita-auto-backup',
    );

    console.log(`[BackupScheduler] Arquivo criado: ${result.filename}`);

    if (retentionDays > 0) {
      const deleted = await this.backupsService.cleanupOldBackups(backupDir, retentionDays);
      if (deleted > 0) {
        console.log(`[BackupScheduler] ${deleted} backups antigos removidos.`);
      }
    }
  }
}
