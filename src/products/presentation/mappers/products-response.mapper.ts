import { ProductVariantResponseMapper } from '../../../product-variants/presentation/mappers/product-variant-response.mapper';
import { Product } from '../../domain/models/product';
import { ProductResponseDto } from '../dto/product-response';

export class ProductsResponseMapper {
  static toResponse(product: Product): ProductResponseDto {
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
    };
  }
}
