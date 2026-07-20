import { IsUUID } from 'class-validator';

export class CreateDmDto {
  @IsUUID()
  recipientId!: string;
}
