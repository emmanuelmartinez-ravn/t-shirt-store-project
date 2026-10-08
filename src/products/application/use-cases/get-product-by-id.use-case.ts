import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrl, ProductWithImages } from '../types/product-image-url';

@Injectable()
export class GetProductByIdUseCase {
  private readonly logger: Logger = new Logger(GetProductByIdUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly fileStorageService: FileStorageService,
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

      const images = await this.getImageUrls(product.id, defaultImageUrl);

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

  private async getImageUrls(
    productId: string,
    defaultImageUrl: string,
  ): Promise<ProductImageUrl[]> {
    const images =
      await this.productImageRepository.getActiveImagesByProductIds([
        productId,
      ]);

    if (images.length === 0) {
      return [
        { id: null, url: defaultImageUrl, expiresIn: null, isDefault: true },
      ];
    }

    const expiresIn = getSignedUrlTtlSeconds();
    return Promise.all(
      images.map(async (image) => ({
        id: image.id,
        url: await this.fileStorageService.getSignedUrl(image.imagePath),
        expiresIn,
        isDefault: false,
      })),
    );
  }
}
