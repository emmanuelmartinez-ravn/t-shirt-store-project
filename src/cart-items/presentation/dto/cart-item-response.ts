import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the cart item',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({ description: 'Quantity of this item in the cart', example: 1 })
  quantity!: number;

  @ApiProperty({
    description: 'Id of the cart this item belongs to',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  cartId!: string;

  @ApiProperty({
    description: 'Id of the product variant added to the cart',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  productVariantId!: string;

  @ApiProperty({
    description: 'Date the item was added to the cart',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date the cart item was last updated',
    example: '2026-08-26T16:38:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Date the cart item was soft-deleted, if applicable',
    example: null,
    nullable: true,
    type: String,
  })
  deletedAt!: Date | null;
}
