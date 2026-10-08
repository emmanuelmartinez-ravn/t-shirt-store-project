import { ApiProperty } from '@nestjs/swagger';
import { ProductImageResponseDto } from './product-image-response';

export class ProductImagesResponseDto {
  @ApiProperty({
    description:
      "The product's full current image list, ordered by upload date (oldest first)",
    type: ProductImageResponseDto,
    isArray: true,
  })
  images!: ProductImageResponseDto[];
}
