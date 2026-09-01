import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class ToggleProductDisabledUseCase {
  private readonly logger: Logger = new Logger(
    ToggleProductDisabledUseCase.name,
  );

  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    try {
      const product = await this.productRepository.getProductById(id);

      if (!product || product.deletedAt) {
        throw new ProductNotFoundError(id);
      }

      const updatedProduct = Product.setDisabled(product, !product.disabled);
      const result = await this.productRepository.setDisabled(updatedProduct);

      this.logger.log(`Toggled disabled status for product ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to toggle disabled status for product ${id}`,
        error,
      );

      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException({
          error: 'Product not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
