import { ApiProperty } from '@nestjs/swagger';

export class UserAvatarResponseDto {
  @ApiProperty({
    description:
      "URL to the user's avatar image: a time-limited presigned URL for an " +
      'uploaded avatar, or the URL of the default avatar image',
    example:
      'https://tshirt-store-avatars.s3.us-east-1.amazonaws.com/avatars/3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f/0b8f2c1e-4d3a-4e5f-9a1b-2c3d4e5f6a7b.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600',
  })
  avatarUrl!: string;

  @ApiProperty({
    description:
      'Number of seconds until avatarUrl expires, or null for the default avatar (never expires)',
    type: Number,
    nullable: true,
    example: 3600,
  })
  expiresIn!: number | null;

  @ApiProperty({
    description:
      'Whether avatarUrl points to the default avatar (the user has not uploaded one)',
    example: false,
  })
  isDefault!: boolean;
}
