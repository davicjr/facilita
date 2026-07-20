import { IsOptional, IsUUID } from 'class-validator';

export class UpdateShareLocalCategoryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
