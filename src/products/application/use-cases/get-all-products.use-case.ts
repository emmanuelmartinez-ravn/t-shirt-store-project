import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class GetAllProductsUseCase {
  private readonly logger: Logger = new Logger(GetAllProductsUseCase.name);

  constructor(private readonly productRepository: ProductRepository) {}

  async execute(params: {
    page: number;
    limit: number;
    name?: string;
    categoryId?: string;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<Product>> {
    try {
      const result = await this.productRepository.getAllProducts(params);
      this.logger.log(
        `Retrieved ${result.items.length} products (page ${params.page})`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve products', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
