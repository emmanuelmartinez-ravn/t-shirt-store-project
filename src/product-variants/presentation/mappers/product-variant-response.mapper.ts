import { ProductImageUrl } from '../../../products/application/types/product-image-url';
import { ProductImageResponseMapper } from '../../../products/presentation/mappers/product-image-response.mapper';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantResponseDto } from '../dto/product-variant-response';

export class ProductVariantResponseMapper {
  static toResponse(
    variant: ProductVariant,
    images?: ProductImageUrl[],
  ): ProductVariantResponseDto {
    return {
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      disabled: variant.disabled,
      attributes: variant.attributes,
      productId: variant.productId,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      deletedAt: variant.deletedAt,
      ...(images
        ? {
            images: images.map((image) =>
              ProductImageResponseMapper.toResponse(image),
            ),
          }
        : {}),
    };
  }
}
