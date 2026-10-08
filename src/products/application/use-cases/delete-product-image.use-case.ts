import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';

@Injectable()
export class DeleteProductImageUseCase {
  private readonly logger: Logger = new Logger(DeleteProductImageUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly productImageUrlsService: ProductImageUrlsService,
  ) {}

  async execute(
    imageId: string,
    defaultImageUrl: string,
  ): Promise<{ images: ProductImageUrl[] }> {
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

      await this.productImageRepository.deleteImage(ProductImage.delete(image));
      await this.deleteStoredImage(image.imagePath);

      const images = await this.productImageUrlsService.getImageUrls(
        product.id,
        defaultImageUrl,
      );

      this.logger.log(`Deleted image ${imageId} of product ${product.name}`);
      return { images };
    } catch (error) {
      this.logger.error(`Failed to delete product image ${imageId}`, error);

      if (error instanceof ProductImageNotFoundError) {
        throw new NotFoundException({
          error: 'Product image not found',
          details: [],
        });
      }

      throw new InternalServerErrorException({
        error: 'Failed to delete product image',
        details: [],
      });
    }
  }

  private async deleteStoredImage(key: string): Promise<void> {
    try {
      await this.fileStorageService.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to delete stored product image ${key}`, error);
    }
  }
}
