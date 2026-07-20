import { ArrayNotEmpty, IsArray, IsIn } from 'class-validator';
import { backupEntities, type BackupEntity } from '../../backups/backups.types';

export class ResetDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(backupEntities, { each: true })
  entities!: BackupEntity[];
}
