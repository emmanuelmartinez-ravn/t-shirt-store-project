import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { Product } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';
import { DeleteProductImageUseCase } from './delete-product-image.use-case';

describe('DeleteProductImageUseCase', () => {
  let useCase: DeleteProductImageUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;
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
  const image = ProductImage.restore({
    id: 'image-id',
    imagePath: 'products/product-id/image.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
    variantId: null,
  });
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
  const remainingImages: ProductImageUrl[] = [
    {
      id: 'other-image-id',
      url: 'https://bucket.s3.amazonaws.com/products/product-id/other.png?signed',
      expiresIn: 3600,
      isDefault: false,
      variantId: null,
    },
  ];
  const notFoundResponse = {
    response: { error: 'Product image not found', details: [] },
  };
  const deleteFailedResponse = {
    response: { error: 'Failed to delete product image', details: [] },
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
      getActiveImageById: jest.fn(),
      deleteImage: jest.fn(),
      updateImageVariant: jest.fn(),
    };
    fileStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    productImageUrlsService = {
      getImageUrls: jest.fn(),
      getImageUrl: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productImageRepository.getActiveImageById.mockResolvedValue(image);
    productRepository.getProductById.mockResolvedValue(product);
    productImageRepository.deleteImage.mockImplementation((deleted) =>
      Promise.resolve(deleted),
    );
    fileStorageService.delete.mockResolvedValue(undefined);
    productImageUrlsService.getImageUrls.mockResolvedValue(remainingImages);

    useCase = new DeleteProductImageUseCase(
      productRepository,
      productImageRepository,
      fileStorageService,
      productImageUrlsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it("soft-deletes the image, removes the stored file and returns the product's remaining images", async () => {
      const result = await useCase.execute('image-id', defaultImageUrl);

      expect(productImageRepository.getActiveImageById).toHaveBeenCalledWith(
        'image-id',
      );
      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(productImageUrlsService.getImageUrls).toHaveBeenCalledWith(
        'product-id',
        defaultImageUrl,
      );
      expect(result).toEqual({ images: remainingImages });
    });

    it('passes the repository a deleted copy of the image with deletedAt and updatedAt set and every other field kept', async () => {
      const before = Date.now();

      await useCase.execute('image-id', defaultImageUrl);

      const after = Date.now();
      expect(productImageRepository.deleteImage).toHaveBeenCalledTimes(1);
      const [deleted] = productImageRepository.deleteImage.mock.calls[0];
      expect(deleted).toBeInstanceOf(ProductImage);
      expect(deleted).toMatchObject({
        id: 'image-id',
        imagePath: 'products/product-id/image.png',
        productId: 'product-id',
        variantId: null,
        createdAt: image.createdAt,
      });
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      expect(deleted.deletedAt!.getTime()).toBeGreaterThanOrEqual(before);
      expect(deleted.deletedAt!.getTime()).toBeLessThanOrEqual(after);
      expect(deleted.updatedAt).toEqual(deleted.deletedAt);
    });

    it('deletes the stored file only after the row is soft-deleted, and builds the image list last', async () => {
      await useCase.execute('image-id', defaultImageUrl);

      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledWith(
        'products/product-id/image.png',
      );
      const deleteImageOrder =
        productImageRepository.deleteImage.mock.invocationCallOrder[0];
      const deleteFileOrder =
        fileStorageService.delete.mock.invocationCallOrder[0];
      const getImageUrlsOrder =
        productImageUrlsService.getImageUrls.mock.invocationCallOrder[0];
      expect(deleteImageOrder).toBeLessThan(deleteFileOrder);
      expect(deleteFileOrder).toBeLessThan(getImageUrlsOrder);
    });

    it('returns the default image entry built by the image list when no images remain', async () => {
      const defaultImages: ProductImageUrl[] = [
        {
          id: null,
          url: defaultImageUrl,
          expiresIn: null,
          isDefault: true,
          variantId: null,
        },
      ];
      productImageUrlsService.getImageUrls.mockResolvedValue(defaultImages);

      const result = await useCase.execute('image-id', defaultImageUrl);

      expect(result).toEqual({ images: defaultImages });
    });

    it('warns and still succeeds when deleting the stored file fails', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');
      fileStorageService.delete.mockRejectedValue(new Error('s3 unavailable'));

      const result = await useCase.execute('image-id', defaultImageUrl);

      expect(warn).toHaveBeenCalledWith(
        'Failed to delete stored product image products/product-id/image.png',
        expect.any(Error),
      );
      expect(productImageRepository.deleteImage).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ images: remainingImages });
    });

    it('translates a missing or already-deleted image into a NotFoundException without touching the product or storage', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(null);

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productRepository.getProductById).not.toHaveBeenCalled();
      expect(productImageRepository.deleteImage).not.toHaveBeenCalled();
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('translates a missing product into a NotFoundException without deleting anything', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productImageRepository.deleteImage).not.toHaveBeenCalled();
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product into a NotFoundException without deleting anything', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(productImageRepository.deleteImage).not.toHaveBeenCalled();
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('translates an image deleted concurrently into a NotFoundException without deleting the stored file', async () => {
      productImageRepository.deleteImage.mockRejectedValue(
        new ProductImageNotFoundError('image-id'),
      );

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(notFoundResponse);
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('translates a soft-delete failure into an InternalServerErrorException without deleting the stored file', async () => {
      productImageRepository.deleteImage.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(deleteFailedResponse);
      expect(fileStorageService.delete).not.toHaveBeenCalled();
      expect(productImageUrlsService.getImageUrls).not.toHaveBeenCalled();
    });

    it('translates an unexpected lookup failure into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImageById.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(deleteFailedResponse);
    });

    it('translates an image list failure into an InternalServerErrorException after the image is deleted', async () => {
      productImageUrlsService.getImageUrls.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('image-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(deleteFailedResponse);
      expect(productImageRepository.deleteImage).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
    });
  });
});
