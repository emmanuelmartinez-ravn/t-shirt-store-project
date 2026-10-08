import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { PromoDiscountType } from '../../domain/models/promo';

const PROMO_DISCOUNT_TYPES: PromoDiscountType[] = ['percentage', 'fixed'];

export class UpdatePromoDto {
  @ApiProperty({
    description: 'Unique code customers redeem to apply the promo',
    example: 'SUMMER2026',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Type of discount applied by the promo',
    example: 'percentage',
    enum: PROMO_DISCOUNT_TYPES,
  })
  @IsIn(PROMO_DISCOUNT_TYPES)
  type!: PromoDiscountType;

  @ApiProperty({
    description:
      'Discount value: a percentage (0-100) or a fixed amount, depending on type',
    example: 15,
  })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({
    description: 'Date after which the promo can no longer be used',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiration?: string;

  @ApiPropertyOptional({
    description: 'Remaining number of times the promo can be used',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  remainUsages?: number;

  @ApiPropertyOptional({
    description: 'Minimum purchase amount required to apply the promo',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPurchaseAmount?: number;
}
