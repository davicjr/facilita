import { EntityType } from '@prisma/client';
import { IsArray, IsEnum, IsUUID, MinLength } from 'class-validator';

export class CreateShareDto {
  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsUUID()
  entityId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @MinLength(1, { each: true })
  recipientIds!: string[];
}
