import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';

export class CreateFavoriteDto {
  @ApiProperty({
    description: 'Tipo de entidade a ser favoritada',
    enum: EntityType,
    example: 'LINK',
  })
  @IsEnum(EntityType)
  entityType!: EntityType;

  @ApiProperty({
    description: 'ID do link (quando entityType = LINK)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  linkId?: string;

  @ApiProperty({
    description: 'ID da agenda (quando entityType = SCHEDULE)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiProperty({
    description: 'ID da nota (quando entityType = NOTE)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  noteId?: string;
}
