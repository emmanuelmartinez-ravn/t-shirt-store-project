import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { ProductImageUrlsService } from '../../../products/application/services/product-image-urls.service';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { ProductVariantWithImages } from '../types/product-variant-with-images';

@Injectable()
export class GetAllProductVariantsUseCase {
  private readonly logger: Logger = new Logger(
    GetAllProductVariantsUseCase.name,
  );

  constructor(
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productImageUrlsService: ProductImageUrlsService,
  ) {}

  async execute(params: {
    productId: string;
    page: number;
    limit: number;
    disabled: boolean;
    liked?: boolean;
    userId?: string;
  }): Promise<PaginatedResult<ProductVariantWithImages>> {
    try {
      const result =
        await this.productVariantRepository.getAllProductVariants(params);
      const imagesByVariantId =
        await this.productImageUrlsService.getImageUrlsByVariantIds(
          result.items.map((variant) => variant.id),
        );

      this.logger.log(
        `Retrieved ${result.items.length} product variants (page ${params.page})`,
      );
      return {
        items: result.items.map((variant) => ({
          variant,
          images: imagesByVariantId.get(variant.id) ?? [],
        })),
        total: result.total,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve product variants', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
