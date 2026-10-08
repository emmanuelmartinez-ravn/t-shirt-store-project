import { ApiProperty } from '@nestjs/swagger';

export class ProductImageResponseDto {
  @ApiProperty({
    description:
      'Unique identifier of the image, or null for the default product image',
    example: '0b8f2c1e-4d3a-4e5f-9a1b-2c3d4e5f6a7b',
    nullable: true,
    type: String,
  })
  id!: string | null;

  @ApiProperty({
    description:
      'URL to the image: a time-limited presigned URL for an uploaded image, ' +
      'or the URL of the default product image',
    example:
      'https://tshirt-store-avatars.s3.us-east-1.amazonaws.com/products/3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f/0b8f2c1e-4d3a-4e5f-9a1b-2c3d4e5f6a7b.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600',
  })
  url!: string;

  @ApiProperty({
    description:
      'Number of seconds until url expires, or null for the default image (never expires)',
    type: Number,
    nullable: true,
    example: 3600,
  })
  expiresIn!: number | null;

  @ApiProperty({
    description:
      'Whether url points to the default product image (the product has no uploaded images)',
    example: false,
  })
  isDefault!: boolean;
}
