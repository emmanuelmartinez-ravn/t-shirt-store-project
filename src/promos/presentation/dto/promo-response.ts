import { ApiProperty } from '@nestjs/swagger';
import type { PromoDiscountType } from '../../domain/models/promo';

export class PromoResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the promo',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique code customers redeem to apply the promo',
    example: 'SUMMER2026',
  })
  code!: string;

  @ApiProperty({
    description: 'Type of discount applied by the promo',
    example: 'percentage',
    enum: ['percentage', 'fixed'],
  })
  type!: PromoDiscountType;

  @ApiProperty({
    description:
      'Discount value: a percentage (0-100) or a fixed amount, depending on type',
    example: 15,
  })
  value!: number;

  @ApiProperty({
    description: 'Date after which the promo can no longer be used',
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
    type: String,
  })
  expiration!: Date | null;

  @ApiProperty({
    description: 'Remaining number of times the promo can be used',
    example: 100,
    nullable: true,
    type: Number,
  })
  remainUsages!: number | null;

  @ApiProperty({
    description: 'Minimum purchase amount required to apply the promo',
    example: 50,
    nullable: true,
    type: Number,
  })
  minimumPurchaseAmount!: number | null;

  @ApiProperty({
    description: 'Date the promo was created',
    example: '2026-08-26T16:38:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Date the promo was last updated',
    example: '2026-08-26T16:38:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Date the promo was soft-deleted, if applicable',
    example: null,
    nullable: true,
    type: String,
  })
  deletedAt!: Date | null;
}
