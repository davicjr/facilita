import { IsNotEmpty } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsNotEmpty({ message: 'Valor obrigatorio.' })
  value!: string | number | boolean;
}
