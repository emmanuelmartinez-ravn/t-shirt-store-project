import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class GetAllProductsUseCase {
  private readonly logger: Logger = new Logger(GetAllProductsUseCase.name);

  constructor(private readonly productRepository: ProductRepository) {}

  async execute(): Promise<Product[]> {
    try {
      const products = await this.productRepository.getAllProducts();
      this.logger.log(`Retrieved ${products.length} products`);
      return products;
    } catch (error) {
      this.logger.error('Failed to retrieve products', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
