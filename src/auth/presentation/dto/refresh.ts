import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token issued at sign-in or the previous refresh',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
