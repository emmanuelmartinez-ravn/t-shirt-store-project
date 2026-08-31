import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the product variant',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'Auto-generated, unique SKU of the variant',
    example: 'TS-000001-MED-BLU',
  })
  sku!: string;

  @ApiProperty({ description: 'Price of the variant', example: 19.99 })
  price!: number;

  @ApiProperty({ description: 'Stock quantity of the variant', example: 100 })
  stock!: number;

  @ApiProperty({
    description: 'Whether the variant is disabled',
    example: false,
  })
  disabled!: boolean;

  @ApiProperty({
    description: 'Key-value attributes describing this variant',
    example: { size: 'medium', color: 'blue' },
  })
  attributes!: Record<string, string>;

  @ApiProperty({
    description: 'Id of the product this variant belongs to',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  productId!: string;

  @ApiProperty({
    description: 'Date the variant was created',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date the variant was last updated',
    example: '2026-08-26T16:38:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Date the variant was soft-deleted, if applicable',
    example: null,
    nullable: true,
    type: String,
  })
  deletedAt!: Date | null;
}
