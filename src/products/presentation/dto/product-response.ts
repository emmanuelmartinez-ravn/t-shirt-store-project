import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantResponseDto } from '../../../product-variants/presentation/dto/product-variant-response';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the product',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the product',
    example: 'Classic Tee',
  })
  name!: string;

  @ApiProperty({
    description: 'Auto-generated, unique product code',
    example: 'TS-000001',
  })
  code!: string;

  @ApiProperty({
    description: 'Description of the product, if provided',
    example: 'A classic cotton t-shirt',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({
    description: 'Whether the product is disabled',
    example: false,
  })
  disabled!: boolean;

  @ApiProperty({
    description: 'Id of the category this product belongs to',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Date the product was created',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date the product was last updated',
    example: '2026-08-26T16:38:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Date the product was soft-deleted, if applicable',
    example: null,
    nullable: true,
    type: String,
  })
  deletedAt!: Date | null;

  @ApiPropertyOptional({
    description:
      'Variants of this product; only present when fields includes productVariants',
    type: ProductVariantResponseDto,
    isArray: true,
  })
  productVariants?: ProductVariantResponseDto[];
}
