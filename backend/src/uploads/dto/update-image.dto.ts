import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateImageDto {
  @IsString()
  @IsOptional()
  alt?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
