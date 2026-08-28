import { ApiProperty } from '@nestjs/swagger';

export class AccountActivationTokenResponseDto {
  @ApiProperty({
    description: 'Activation token to send to the user',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  token!: string;

  @ApiProperty({
    description: 'Date the token expires',
    example: '2026-08-26T17:08:00.000Z',
  })
  expiresAt!: Date;
}
