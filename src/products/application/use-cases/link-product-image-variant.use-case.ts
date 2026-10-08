import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { ProductImageAlreadyLinkedError } from '../../domain/errors/product-image-already-linked';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { ProductVariantNotFoundError } from '../../domain/errors/product-variant-not-found';
import { VariantNotInImageProductError } from '../../domain/errors/variant-not-in-image-product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';

@Injectable()
export class LinkProductImageVariantUseCase {
  private readonly logger: Logger = new Logger(
    LinkProductImageVariantUseCase.name,
  );

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productImageUrlsService: ProductImageUrlsService,
  ) {}

  async execute(imageId: string, variantId: string): Promise<ProductImageUrl> {
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

      const variant =
        await this.productVariantRepository.getProductVariantById(variantId);

      if (!variant || variant.deletedAt) {
        throw new ProductVariantNotFoundError(variantId);
      }

      if (variant.productId !== image.productId) {
        throw new VariantNotInImageProductError(variantId, image.productId);
      }

      if (image.variantId === variantId) {
        return await this.productImageUrlsService.getImageUrl(image);
      }

      if (image.variantId !== null) {
        throw new ProductImageAlreadyLinkedError(image.variantId);
      }

      const linked = await this.productImageRepository.updateImageVariant(
        ProductImage.linkVariant(image, variantId),
      );

      this.logger.log(`Linked image ${imageId} to variant ${variant.sku}`);
      return await this.productImageUrlsService.getImageUrl(linked);
    } catch (error) {
      this.logger.error(
        `Failed to link product image ${imageId} to variant ${variantId}`,
        error,
      );

      if (error instanceof ProductImageNotFoundError) {
        throw new NotFoundException({
          error: 'Product image not found',
          details: [],
        });
      }

      if (error instanceof ProductVariantNotFoundError) {
        throw new NotFoundException({
          error: 'Product variant not found',
          details: [],
        });
      }

      if (error instanceof VariantNotInImageProductError) {
        throw new BadRequestException({
          error: "Variant does not belong to the image's product",
          details: [],
        });
      }

      if (error instanceof ProductImageAlreadyLinkedError) {
        throw new ConflictException({
          error: 'Product image is already linked to a variant',
          details: [
            `Linked to variant ${error.currentVariantId}; unlink it first`,
          ],
        });
      }

      throw new InternalServerErrorException({
        error: 'Failed to link product image',
        details: [],
      });
    }
  }
}
