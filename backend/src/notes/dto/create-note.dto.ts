import { IsString, MinLength } from 'class-validator';
import { BaseContentDto } from '../../common/dto/base-content.dto';

export class CreateNoteDto extends BaseContentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
