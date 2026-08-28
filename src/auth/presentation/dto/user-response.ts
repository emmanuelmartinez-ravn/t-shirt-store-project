import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'First name of the user',
    example: 'Joe',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'joe.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Whether the account is disabled (pending activation)',
    example: true,
  })
  disabled!: boolean;

  @ApiProperty({
    description: 'Date the user was created',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;
}
