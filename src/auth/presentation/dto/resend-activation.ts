import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ResendActivationDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;
}
