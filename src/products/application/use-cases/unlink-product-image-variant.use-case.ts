import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { ProductImageNotLinkedError } from '../../domain/errors/product-image-not-linked';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';

@Injectable()
export class UnlinkProductImageVariantUseCase {
  private readonly logger: Logger = new Logger(
    UnlinkProductImageVariantUseCase.name,
  );

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly productImageUrlsService: ProductImageUrlsService,
  ) {}

  async execute(imageId: string): Promise<ProductImageUrl> {
    try {
      const image =
        await this.productImageRepository.getActiveImageById(imageId);

      if (!image) {
        throw new ProductImageNotFoundError(imageId);
      }

      const product = await this.productRepository.getProductById(
        image.productId,
      );

      if (!product || product.deletedAt) {
        throw new ProductImageNotFoundError(imageId);
      }

      if (image.variantId === null) {
        throw new ProductImageNotLinkedError(imageId);
      }

      const unlinked = await this.productImageRepository.updateImageVariant(
        ProductImage.unlinkVariant(image),
      );

      this.logger.log(
        `Unlinked image ${imageId} from variant ${image.variantId}`,
      );
      return await this.productImageUrlsService.getImageUrl(unlinked);
    } catch (error) {
      this.logger.error(`Failed to unlink product image ${imageId}`, error);

      if (error instanceof ProductImageNotFoundError) {
        throw new NotFoundException({
          error: 'Product image not found',
          details: [],
        });
      }

      if (error instanceof ProductImageNotLinkedError) {
        throw new ConflictException({
          error: 'Product image is not linked to a variant',
          details: [],
        });
      }

      throw new InternalServerErrorException({
        error: 'Failed to unlink product image',
        details: [],
      });
    }
  }
}
