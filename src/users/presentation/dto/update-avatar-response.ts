import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvatarResponseDto {
  @ApiProperty({
    description: 'Time-limited presigned URL to download the new avatar image',
    example:
      'https://tshirt-store-avatars.s3.us-east-1.amazonaws.com/avatars/3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f/0b8f2c1e-4d3a-4e5f-9a1b-2c3d4e5f6a7b.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600',
  })
  avatarUrl!: string;

  @ApiProperty({
    description: 'Number of seconds until avatarUrl expires',
    example: 3600,
  })
  expiresIn!: number;
}
