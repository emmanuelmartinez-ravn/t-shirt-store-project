import { Injectable } from '@nestjs/common';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductImageUrl } from '../types/product-image-url';

@Injectable()
export class ProductImageUrlsService {
  constructor(
    private readonly productImageRepository: ProductImageRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Builds a product's current image list with presigned URLs, ordered by
   * upload date. When the product has no images and a defaultImageUrl is
   * given, returns a single default image entry instead of an empty list.
   */
  async getImageUrls(
    productId: string,
    defaultImageUrl?: string,
  ): Promise<ProductImageUrl[]> {
    const images =
      await this.productImageRepository.getActiveImagesByProductIds([
        productId,
      ]);

    if (images.length === 0 && defaultImageUrl !== undefined) {
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
