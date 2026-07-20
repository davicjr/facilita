import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { BaseContentDto } from '../../common/dto/base-content.dto';

export class CreateScheduleDto extends BaseContentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  fileUrl!: string;

  @IsString()
  fileName!: string;

  @IsInt()
  @Min(0)
  fileSize!: number;
}
