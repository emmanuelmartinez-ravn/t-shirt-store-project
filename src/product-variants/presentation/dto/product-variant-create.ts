import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import { IsAttributesRecord } from '../validators/is-attributes-record';

export class CreateProductVariantDto {
  @ApiProperty({
    description: 'Id of the product this variant belongs to',
    example: '3f6a7c9e-8b1a-4b3a-9f1e-1a2b3c4d5e6f',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Price of the variant', example: 19.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Stock quantity of the variant', example: 100 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({
    description:
      'Arbitrary key-value attributes describing this variant (e.g. size, color) - values must be non-empty strings',
    example: { size: 'medium', color: 'blue' },
  })
  @IsObject()
  @IsNotEmptyObject()
  @IsAttributesRecord()
  attributes!: Record<string, string>;
}
