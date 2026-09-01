import { ApiProperty } from '@nestjs/swagger';

export class LikedProductVariantResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the like',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'Id of the user who liked the product variant',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  userId!: string;

  @ApiProperty({
    description: 'Id of the liked product variant',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  productVariantId!: string;

  @ApiProperty({
    description: 'Date the product variant was liked',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;
}
