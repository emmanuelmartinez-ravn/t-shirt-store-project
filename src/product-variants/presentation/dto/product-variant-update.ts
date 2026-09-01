import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, Min } from 'class-validator';

export class UpdateProductVariantDto {
  @ApiProperty({ description: 'Price of the variant', example: 19.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'Stock quantity of the variant', example: 100 })
  @IsInt()
  @Min(0)
  stock!: number;
}
