import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { UnreadableImageError } from '../../../storage/errors/unreadable-image';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ImageProcessorService } from '../../../storage/services/image-processor.service';
import { ProductImageDimensionsTooLargeError } from '../../domain/errors/product-image-dimensions-too-large';
import { ProductImageLimitExceededError } from '../../domain/errors/product-image-limit-exceeded';
import { ProductImageTooLargeError } from '../../domain/errors/product-image-too-large';
import { ProductImagesRequiredError } from '../../domain/errors/product-images-required';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { UnsupportedProductImageFormatError } from '../../domain/errors/unsupported-product-image-format';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import {
  PRODUCT_IMAGE_ACCEPTED_FORMATS,
  PRODUCT_IMAGE_CONTENT_TYPES,
  PRODUCT_IMAGE_EXTENSIONS,
  PRODUCT_IMAGE_LIMIT_MESSAGE,
  PRODUCT_IMAGE_MAX_DIMENSION,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
  PRODUCT_MAX_IMAGES,
  ProductImageFormat,
} from '../config/product-image-constraints';
import { ProductImageUrl } from '../types/product-image-url';

export interface ProductImageUpload {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class UploadProductImagesUseCase {
  private readonly logger: Logger = new Logger(UploadProductImagesUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  async execute(
    productId: string,
    files: ProductImageUpload[] | undefined,
  ): Promise<{ images: ProductImageUrl[] }> {
    try {
      const product = await this.productRepository.getProductById(productId);

      if (!product || product.deletedAt) {
        throw new ProductNotFoundError(productId);
      }

      if (!files || files.length === 0) {
        throw new ProductImagesRequiredError();
      }

      const formats: ProductImageFormat[] = [];
      for (const file of files) {
        formats.push(await this.validateImage(file));
      }

      const existingCount =
        await this.productImageRepository.countActiveImages(productId);

      if (existingCount + files.length > PRODUCT_MAX_IMAGES) {
        throw new ProductImageLimitExceededError(
          existingCount,
          files.length,
          PRODUCT_MAX_IMAGES,
        );
      }

      const uploadedKeys: string[] = [];
      try {
        const images: ProductImage[] = [];
        for (const [index, file] of files.entries()) {
          const format = formats[index];
          const normalized = await this.imageProcessorService.normalize(
            file.buffer,
            format,
          );
          const key = `products/${productId}/${randomUUID()}.${PRODUCT_IMAGE_EXTENSIONS[format]}`;

          await this.fileStorageService.upload({
            key,
            body: normalized,
            contentType: PRODUCT_IMAGE_CONTENT_TYPES[format],
          });
          uploadedKeys.push(key);
          images.push(ProductImage.create({ imagePath: key, productId }));
        }

        await this.productImageRepository.createImages(images);
      } catch (error) {
        await this.deleteUploadedImages(uploadedKeys);
        throw error;
      }

      const images = await this.getImageUrls(productId);

      this.logger.log(
        `Uploaded ${files.length} images for product ${product.name}`,
      );
      return { images };
    } catch (error) {
      this.logger.error(
        `Failed to upload images for product ${productId}`,
        error,
      );

      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException({
          error: 'Product not found',
          details: [],
        });
      }

      if (error instanceof ProductImagesRequiredError) {
        throw new BadRequestException({
          error: 'At least one image file is required',
          details: [],
        });
      }

      if (error instanceof ProductImageTooLargeError) {
        throw new PayloadTooLargeException({
          error: PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
          details: [],
        });
      }

      if (error instanceof UnsupportedProductImageFormatError) {
        throw new UnsupportedMediaTypeException({
          error: 'Unsupported image format',
          details: [`${error.fileName}: accepted formats are png, jpg, jpeg`],
        });
      }

      if (error instanceof ProductImageDimensionsTooLargeError) {
        throw new BadRequestException({
          error: `Image dimensions must not exceed ${error.maxDimension}x${error.maxDimension}`,
          details: [
            `${error.fileName}: received ${error.width}x${error.height}`,
          ],
        });
      }

      if (error instanceof ProductImageLimitExceededError) {
        throw new BadRequestException({
          error: PRODUCT_IMAGE_LIMIT_MESSAGE,
          details: [
            `Product has ${error.existingCount} images, tried to add ${error.newCount}`,
          ],
        });
      }

      throw new InternalServerErrorException({
        error: 'Failed to upload product images',
        details: [],
      });
    }
  }

  private async validateImage(
    file: ProductImageUpload,
  ): Promise<ProductImageFormat> {
    if (file.size > PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES) {
      throw new ProductImageTooLargeError(
        file.originalname,
        file.size,
        PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
      );
    }

    let metadata: Awaited<ReturnType<ImageProcessorService['getMetadata']>>;
    try {
      metadata = await this.imageProcessorService.getMetadata(file.buffer);
    } catch (error) {
      if (error instanceof UnreadableImageError) {
        throw new UnsupportedProductImageFormatError(
          file.originalname,
          undefined,
        );
      }
      throw error;
    }

    const { format, width, height } = metadata;
    const acceptedFormat = PRODUCT_IMAGE_ACCEPTED_FORMATS.find(
      (accepted) => accepted === format,
    );

    if (!acceptedFormat || width === undefined || height === undefined) {
      throw new UnsupportedProductImageFormatError(file.originalname, format);
    }

    if (
      width > PRODUCT_IMAGE_MAX_DIMENSION ||
      height > PRODUCT_IMAGE_MAX_DIMENSION
    ) {
      throw new ProductImageDimensionsTooLargeError(
        file.originalname,
        width,
        height,
        PRODUCT_IMAGE_MAX_DIMENSION,
      );
    }

    return acceptedFormat;
  }

  private async getImageUrls(productId: string): Promise<ProductImageUrl[]> {
    const images =
      await this.productImageRepository.getActiveImagesByProductIds([
        productId,
      ]);
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

  private async deleteUploadedImages(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.fileStorageService.delete(key);
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to clean up uploaded product image ${key}`,
          cleanupError,
        );
      }
    }
  }
}
