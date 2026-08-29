import { Product } from '../../domain/models/product';

export abstract class ProductRepository {
  abstract createProduct(product: Product): Promise<Product>;
  abstract getAllProducts(): Promise<Product[]>;
  abstract updateProduct(product: Product): Promise<Product>;
  abstract deleteProduct(product: Product): Promise<Product>;
  abstract getProductById(id: string): Promise<Product | null>;
}
