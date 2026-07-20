import { ArrayNotEmpty, IsArray, IsIn } from 'class-validator';
import { backupEntities, type BackupEntity } from '../backups.types';

export class ExportBackupDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(backupEntities, { each: true })
  entities!: BackupEntity[];
}
