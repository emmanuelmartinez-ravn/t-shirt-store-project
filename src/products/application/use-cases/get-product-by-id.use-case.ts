import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductWithImages } from '../types/product-image-url';

@Injectable()
export class GetProductByIdUseCase {
  private readonly logger: Logger = new Logger(GetProductByIdUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageUrlsService: ProductImageUrlsService,
  ) {}

  async execute(
    id: string,
    defaultImageUrl: string,
  ): Promise<ProductWithImages> {
    try {
      const product = await this.productRepository.getProductById(id);

      if (!product || product.deletedAt) {
        throw new ProductNotFoundError(id);
      }

      const images = await this.productImageUrlsService.getImageUrls(
        product.id,
        defaultImageUrl,
      );

      this.logger.log(`Retrieved product ${product.name}`);
      return { product, images };
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
