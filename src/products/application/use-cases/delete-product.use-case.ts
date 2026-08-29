import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductAlreadyDeletedError } from '../../domain/errors/product-already-deleted';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger: Logger = new Logger(DeleteProductUseCase.name);

  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    try {
      const existingProduct = await this.productRepository.getProductById(id);

      if (!existingProduct) {
        throw new ProductNotFoundError(id);
      }

      if (existingProduct.deletedAt) {
        throw new ProductAlreadyDeletedError(id);
      }

      const deletedProduct = Product.delete(existingProduct);
      const persistedProduct =
        await this.productRepository.deleteProduct(deletedProduct);
      this.logger.log(`Deleted product ${persistedProduct.name}`);
      return persistedProduct;
    } catch (error) {
      this.logger.error(`Failed to delete product ${id}`, error);

      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException({
          error: 'Product not found',
          details: [],
        });
      }

      if (error instanceof ProductAlreadyDeletedError) {
        throw new GoneException({
          error: 'Product already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
