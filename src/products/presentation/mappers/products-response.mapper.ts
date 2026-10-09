import { ProductVariantResponseMapper } from '../../../product-variants/presentation/mappers/product-variant-response.mapper';
import { ProductImageUrl } from '../../application/types/product-image-url';
import { Product } from '../../domain/models/product';
import { ProductImageResponseDto } from '../dto/product-image-response';
import { ProductResponseDto } from '../dto/product-response';
import { ProductImageResponseMapper } from './product-image-response.mapper';

export class ProductsResponseMapper {
  static toResponse(
    product: Product,
    images?: ProductImageUrl[],
  ): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      disabled: product.disabled,
      categoryId: product.categoryId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      ...(product.productVariants
        ? {
            productVariants: product.productVariants.map((variant) =>
              ProductVariantResponseMapper.toResponse(variant),
            ),
          }
        : {}),
      ...(images
        ? {
            images: images.map((image) =>
              ProductsResponseMapper.toImageResponse(image),
            ),
          }
        : {}),
    };
  }

  static toImageResponse(image: ProductImageUrl): ProductImageResponseDto {
    return ProductImageResponseMapper.toResponse(image);
  }
}
