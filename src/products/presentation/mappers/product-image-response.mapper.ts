import { ProductImageUrl } from '../../application/types/product-image-url';
import { ProductImageResponseDto } from '../dto/product-image-response';

export class ProductImageResponseMapper {
  static toResponse(image: ProductImageUrl): ProductImageResponseDto {
    return {
      id: image.id,
      url: image.url,
      expiresIn: image.expiresIn,
      isDefault: image.isDefault,
      variantId: image.variantId,
    };
  }
}
