import { InternalServerErrorException } from '@nestjs/common';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { Product, ProductField } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { GetAllProductsUseCase } from './get-all-products.use-case';

describe('GetAllProductsUseCase', () => {
  let useCase: GetAllProductsUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const originalTtl = process.env.AWS_S3_SIGNED_URL_TTL;

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
  const productWithoutImages = Product.restore({
    ...product,
    id: 'other-product-id',
    name: 'Premium Tee',
    code: 'TS-000002',
  });
  const products = [product];
  const firstImage = ProductImage.restore({
    id: 'image-1',
    imagePath: 'products/product-id/first.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
    variantId: null,
  });
  const secondImage = ProductImage.restore({
    ...firstImage,
    id: 'image-2',
    imagePath: 'products/product-id/second.jpg',
  });
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
  const defaultImage = {
    id: null,
    url: defaultImageUrl,
    expiresIn: null,
    isDefault: true,
  };
  const signedUrlFor = (key: string): string =>
    `https://bucket.s3.amazonaws.com/${key}?signed`;

  beforeEach(() => {
    delete process.env.AWS_S3_SIGNED_URL_TTL;

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
    };
    fileStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    productRepository.getAllProducts.mockResolvedValue({
      items: products,
      total: products.length,
    });
    productImageRepository.getActiveImagesByProductIds.mockResolvedValue([]);
    fileStorageService.getSignedUrl.mockImplementation((key) =>
      Promise.resolve(signedUrlFor(key)),
    );

    useCase = new GetAllProductsUseCase(
      productRepository,
      productImageRepository,
      fileStorageService,
    );
  });

  afterEach(() => {
    if (originalTtl === undefined) {
      delete process.env.AWS_S3_SIGNED_URL_TTL;
    } else {
      process.env.AWS_S3_SIGNED_URL_TTL = originalTtl;
    }
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('returns the paginated products with the default image when none of them has images', async () => {
      const result = await useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual({
        items: [{ product, images: [defaultImage] }],
        total: products.length,
      });
    });

    it('fetches the images of the whole page in a single query', async () => {
      productRepository.getAllProducts.mockResolvedValue({
        items: [product, productWithoutImages],
        total: 2,
      });

      await useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledTimes(1);
      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledWith(['product-id', 'other-product-id']);
    });

    it('groups presigned images under their product and falls back to the default image for products without any', async () => {
      productRepository.getAllProducts.mockResolvedValue({
        items: [product, productWithoutImages],
        total: 2,
      });
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue([
        firstImage,
        secondImage,
      ]);

      const result = await useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        firstImage.imagePath,
      );
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        secondImage.imagePath,
      );
      expect(result).toEqual({
        items: [
          {
            product,
            images: [
              {
                id: 'image-1',
                url: signedUrlFor(firstImage.imagePath),
                expiresIn: 3600,
                isDefault: false,
              },
              {
                id: 'image-2',
                url: signedUrlFor(secondImage.imagePath),
                expiresIn: 3600,
                isDefault: false,
              },
            ],
          },
          { product: productWithoutImages, images: [defaultImage] },
        ],
        total: 2,
      });
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue([
        firstImage,
      ]);

      const result = await useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      expect(result.items[0].images[0].expiresIn).toBe(900);
    });

    it('returns an empty page without presigning anything', async () => {
      productRepository.getAllProducts.mockResolvedValue({
        items: [],
        total: 0,
      });

      const result = await useCase.execute(
        { page: 3, limit: 20, disabled: false },
        defaultImageUrl,
      );

      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledWith([]);
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('passes the params through unchanged to the repository, including optional filters', async () => {
      const params = {
        page: 2,
        limit: 10,
        name: 'shirt',
        categoryId: 'category-id',
        disabled: true,
        liked: true,
        userId: 'user-id',
        fields: ['productVariants'] as ProductField[],
      };

      await useCase.execute(params, defaultImageUrl);

      expect(productRepository.getAllProducts).toHaveBeenCalledWith(params);
    });

    it('passes the params through unchanged to the repository when optional filters are omitted', async () => {
      const params = { page: 1, limit: 20, disabled: false };

      await useCase.execute(params, defaultImageUrl);

      expect(productRepository.getAllProducts).toHaveBeenCalledWith(params);
    });

    it('translates unexpected errors into an InternalServerErrorException', async () => {
      productRepository.getAllProducts.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute(
          { page: 1, limit: 20, disabled: false },
          defaultImageUrl,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('translates an image lookup failure into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImagesByProductIds.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Internal Server Error', details: [] },
      });
    });

    it('translates a presign failure into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue([
        firstImage,
      ]);
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute(
        { page: 1, limit: 20, disabled: false },
        defaultImageUrl,
      );

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Internal Server Error', details: [] },
      });
    });
  });
});
