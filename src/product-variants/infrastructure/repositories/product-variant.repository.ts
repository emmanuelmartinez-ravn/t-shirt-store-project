import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { ProductVariant } from '../../domain/models/product-variant';

export abstract class ProductVariantRepository {
  abstract createProductVariant(
    variant: ProductVariant,
  ): Promise<ProductVariant>;
  abstract getAllProductVariants(params: {
    productId: string;
    page: number;
    limit: number;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<ProductVariant>>;
  abstract getProductVariantById(id: string): Promise<ProductVariant | null>;
}
