import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { Product } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';
import { UnlinkProductImageVariantUseCase } from './unlink-product-image-variant.use-case';

describe('UnlinkProductImageVariantUseCase', () => {
  let useCase: UnlinkProductImageVariantUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let productImageUrlsService: jest.Mocked<ProductImageUrlsService>;

  const product = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    code: 'TS-000001',
    description: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });
  const linkedImage = ProductImage.restore({
    id: 'image-id',
    imagePath: 'products/product-id/image.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
    variantId: 'variant-id',
  });
  const unlinkedImage = ProductImage.restore({
    ...linkedImage,
    variantId: null,
  });
  const unlinkedImageUrl: ProductImageUrl = {
    id: 'image-id',
    url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
    expiresIn: 3600,
    isDefault: false,
    variantId: null,
  };
  const notFoundResponse = {
    response: { error: 'Product image not found', details: [] },
  };
  const unlinkFailedResponse = {
    response: { error: 'Failed to unlink product image', details: [] },
  };

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      setDisabled: jest.fn(),
      getProductById: jest.fn(),
      getLastProductCode: jest.fn(),
    };
    productImageRepository = {
      countActiveImages: jest.fn(),
      createImages: jest.fn(),
      getActiveImagesByProductIds: jest.fn(),
      getActiveImagesByVariantIds: jest.fn(),
      getActiveImageById: jest.fn(),
      deleteImage: jest.fn(),
      updateImageVariant: jest.fn(),
    };
    productImageUrlsService = {
      getImageUrls: jest.fn(),
      getImageUrlsByVariantIds: jest.fn(),
      getImageUrl: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productImageRepository.getActiveImageById.mockResolvedValue(linkedImage);
    productRepository.getProductById.mockResolvedValue(product);
    productImageRepository.updateImageVariant.mockImplementation((updated) =>
      Promise.resolve(updated),
    );
    productImageUrlsService.getImageUrl.mockResolvedValue(unlinkedImageUrl);

    useCase = new UnlinkProductImageVariantUseCase(
      productRepository,
      productImageRepository,
      productImageUrlsService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('unlinks a linked image and returns the presigned image with a null variant id', async () => {
      const result = await useCase.execute('image-id');

      expect(productImageRepository.getActiveImageById).toHaveBeenCalledWith(
        'image-id',
      );
      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(unlinkedImageUrl);
      expect(result.variantId).toBeNull();
    });

    it('persists a copy of the image with a null variant id and a fresh updatedAt, keeping every other field', async () => {
      const before = Date.now();

      await useCase.execute('image-id');

      const after = Date.now();
      const [unlinked] =
        productImageRepository.updateImageVariant.mock.calls[0];
      expect(unlinked).toBeInstanceOf(ProductImage);
      expect(unlinked).not.toBe(linkedImage);
      expect(unlinked).toMatchObject({
        id: 'image-id',
        imagePath: 'products/product-id/image.png',
        createdAt: linkedImage.createdAt,
        deletedAt: null,
        productId: 'product-id',
        variantId: null,
      });
      expect(unlinked.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(unlinked.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('presigns the image returned by the repository', async () => {
      const persisted = ProductImage.restore({
        ...unlinkedImage,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });
      productImageRepository.updateImageVariant.mockResolvedValue(persisted);

      await useCase.execute('image-id');

      expect(productImageUrlsService.getImageUrl).toHaveBeenCalledTimes(1);
      expect(productImageUrlsService.getImageUrl).toHaveBeenCalledWith(
        persisted,
      );
    });

    it('allows unlinking an image of a disabled product', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, disabled: true }),
      );

      const result = await useCase.execute('image-id');

      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(unlinkedImageUrl);
    });

    it('translates an image that is not linked to a variant into a ConflictException without writing', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(
        unlinkedImage,
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Product image is not linked to a variant',
          details: [],
        },
      });
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates a missing or already-deleted image into a NotFoundException without touching the product', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(null);

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productRepository.getProductById).not.toHaveBeenCalled();
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it("translates a missing image's product into a NotFoundException without writing", async () => {
      productRepository.getProductById.mockResolvedValue(null);

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it("translates a soft-deleted image's product into a NotFoundException without writing", async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates an image deleted concurrently into a NotFoundException without presigning', async () => {
      productImageRepository.updateImageVariant.mockRejectedValue(
        new ProductImageNotFoundError('image-id'),
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates a write failure into an InternalServerErrorException without presigning', async () => {
      productImageRepository.updateImageVariant.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(unlinkFailedResponse);
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates an unexpected lookup failure into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImageById.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(unlinkFailedResponse);
    });

    it('translates a presign failure after unlinking into an InternalServerErrorException', async () => {
      productImageUrlsService.getImageUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('image-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(unlinkFailedResponse);
      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
