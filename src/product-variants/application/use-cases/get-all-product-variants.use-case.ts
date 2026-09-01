import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';

@Injectable()
export class GetAllProductVariantsUseCase {
  private readonly logger: Logger = new Logger(
    GetAllProductVariantsUseCase.name,
  );

  constructor(
    private readonly productVariantRepository: ProductVariantRepository,
  ) {}

  async execute(params: {
    productId: string;
    page: number;
    limit: number;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<ProductVariant>> {
    try {
      const result =
        await this.productVariantRepository.getAllProductVariants(params);
      this.logger.log(
        `Retrieved ${result.items.length} product variants (page ${params.page})`,
      );
      return result;
    } catch (error) {
      this.logger.error('Failed to retrieve product variants', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
