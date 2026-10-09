import { Injectable } from '@nestjs/common';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImage } from '../../domain/models/product-image';
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
        {
          id: null,
          url: defaultImageUrl,
          expiresIn: null,
          isDefault: true,
          variantId: null,
        },
      ];
    }

    return Promise.all(images.map((image) => this.getImageUrl(image)));
  }

  /**
   * Builds the image lists of several variants with presigned URLs from a
   * single query, keyed by variant id and ordered by upload date. Variants with
   * no linked images are absent from the map (no default image fallback).
   */
  async getImageUrlsByVariantIds(
    variantIds: string[],
  ): Promise<Map<string, ProductImageUrl[]>> {
    const images =
      await this.productImageRepository.getActiveImagesByVariantIds(variantIds);
    const imageUrls = await Promise.all(
      images.map((image) => this.getImageUrl(image)),
    );

    const imagesByVariantId = new Map<string, ProductImageUrl[]>();
    images.forEach((image, index) => {
      if (image.variantId === null) {
        return;
      }
      const variantImages = imagesByVariantId.get(image.variantId) ?? [];
      variantImages.push(imageUrls[index]);
      imagesByVariantId.set(image.variantId, variantImages);
    });
    return imagesByVariantId;
  }

  /** Presigns a single uploaded image. */
  async getImageUrl(image: ProductImage): Promise<ProductImageUrl> {
    return {
      id: image.id,
      url: await this.fileStorageService.getSignedUrl(image.imagePath),
      expiresIn: getSignedUrlTtlSeconds(),
      isDefault: false,
      variantId: image.variantId,
    };
  }
}
