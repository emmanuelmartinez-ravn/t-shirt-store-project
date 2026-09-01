import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { Product } from '../../domain/models/product';

export abstract class ProductRepository {
  abstract createProduct(product: Product): Promise<Product>;
  abstract getAllProducts(params: {
    page: number;
    limit: number;
    name?: string;
    categoryId?: string;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<Product>>;
  abstract updateProduct(product: Product): Promise<Product>;
  abstract deleteProduct(product: Product): Promise<Product>;
  abstract setDisabled(product: Product): Promise<Product>;
  abstract getProductById(id: string): Promise<Product | null>;
  abstract getLastProductCode(): Promise<string | null>;
}
