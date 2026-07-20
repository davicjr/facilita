import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsArray,
  IsEnum,
} from 'class-validator';
import { EntityStatus } from '@prisma/client';

export class CreateImageDto {
  @IsUUID()
  uploadedBy!: string;

  @IsString()
  filename!: string;

  @IsString()
  originalName!: string;

  @IsString()
  url!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  size!: number;

  @IsInt()
  @IsOptional()
  width?: number;

  @IsInt()
  @IsOptional()
  height?: number;

  @IsString()
  @IsOptional()
  alt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(EntityStatus)
  @IsOptional()
  status?: EntityStatus;
}
