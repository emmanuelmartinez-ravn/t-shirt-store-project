import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Id of the product variant to add to the cart',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID()
  @IsNotEmpty()
  productVariantId!: string;

  @ApiProperty({ description: 'Quantity to add', example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
