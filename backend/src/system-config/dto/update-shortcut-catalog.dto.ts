import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ShortcutCatalogItemDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  context!: string;

  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  keys!: string[];

  @IsString()
  target!: string;

  @IsBoolean()
  openInNewTab!: boolean;
}

export class UpdateShortcutCatalogDto {
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => ShortcutCatalogItemDto)
  items!: ShortcutCatalogItemDto[];
}
