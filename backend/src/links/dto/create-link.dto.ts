import { IsInt, IsOptional, IsString, IsUrl, Min, MinLength } from 'class-validator';
import { BaseContentDto } from '../../common/dto/base-content.dto';

export class CreateLinkDto extends BaseContentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
