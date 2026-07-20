import { IsString, IsOptional, IsUUID, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryImagesDto {
  @IsUUID()
  @IsOptional()
  uploadedBy?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
