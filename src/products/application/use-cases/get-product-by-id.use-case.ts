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
export class GetProductByIdUseCase {
  private readonly logger: Logger = new Logger(GetProductByIdUseCase.name);

  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    try {
      const product = await this.productRepository.getProductById(id);

      if (!product || product.deletedAt) {
        throw new ProductNotFoundError(id);
      }

      this.logger.log(`Retrieved product ${product.name}`);
      return product;
    } catch (error) {
      this.logger.error(`Failed to retrieve product ${id}`, error);

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
