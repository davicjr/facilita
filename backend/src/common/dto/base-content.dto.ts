import { EntityStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class BaseContentDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imagePosition?: string;

  @IsOptional()
  @IsNumber()
  imageScale?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
