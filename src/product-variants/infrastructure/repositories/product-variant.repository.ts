import { ProductVariant } from '../../domain/models/product-variant';

export abstract class ProductVariantRepository {
  abstract createProductVariant(
    variant: ProductVariant,
  ): Promise<ProductVariant>;
}
