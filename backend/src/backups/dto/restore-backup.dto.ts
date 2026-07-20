import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { backupEntities, type BackupEntity } from '../backups.types';

export class BackupPayloadDto {
  @IsObject()
  meta!: Record<string, unknown>;

  @IsObject()
  data!: Record<string, unknown>;
}

export class RestoreBackupDto {
  @IsOptional()
  @IsArray()
  @IsIn(backupEntities, { each: true })
  entities?: BackupEntity[];

  @IsOptional()
  @IsIn(['merge'])
  mode?: 'merge';

  @ValidateNested()
  @Type(() => BackupPayloadDto)
  backup!: BackupPayloadDto;
}
