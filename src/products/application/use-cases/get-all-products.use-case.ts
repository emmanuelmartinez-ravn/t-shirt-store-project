import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImage } from '../../domain/models/product-image';
import { ProductField } from '../../domain/models/product';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrl, ProductWithImages } from '../types/product-image-url';

@Injectable()
export class GetAllProductsUseCase {
  private readonly logger: Logger = new Logger(GetAllProductsUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(
    params: {
      page: number;
      limit: number;
      name?: string;
      categoryId?: string;
      disabled: boolean;
      liked?: boolean;
      userId?: string;
      fields?: ProductField[];
    },
    defaultImageUrl: string,
  ): Promise<PaginatedResult<ProductWithImages>> {
    try {
      const result = await this.productRepository.getAllProducts(params);
      const images =
        await this.productImageRepository.getActiveImagesByProductIds(
          result.items.map((product) => product.id),
        );
      const imagesByProductId = await this.toImageUrlsByProductId(images);

      this.logger.log(
        `Retrieved ${result.items.length} products (page ${params.page})`,
      );
      return {
        items: result.items.map((product) => ({
          product,
          images: imagesByProductId.get(product.id) ?? [
            {
              id: null,
              url: defaultImageUrl,
              expiresIn: null,
              isDefault: true,
              variantId: null,
            },
          ],
        })),
        total: result.total,
      };
    } catch (error) {
      this.logger.error('Failed to retrieve products', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }

  private async toImageUrlsByProductId(
    images: ProductImage[],
  ): Promise<Map<string, ProductImageUrl[]>> {
    const expiresIn = getSignedUrlTtlSeconds();
    const urls = await Promise.all(
      images.map((image) =>
        this.fileStorageService.getSignedUrl(image.imagePath),
      ),
    );

    const imagesByProductId = new Map<string, ProductImageUrl[]>();
    images.forEach((image, index) => {
      const productImages = imagesByProductId.get(image.productId) ?? [];
      productImages.push({
        id: image.id,
        url: urls[index],
        expiresIn,
        isDefault: false,
        variantId: image.variantId,
      });
      imagesByProductId.set(image.productId, productImages);
    });
    return imagesByProductId;
  }
}
