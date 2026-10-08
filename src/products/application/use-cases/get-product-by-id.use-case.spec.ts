import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { Product } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';

describe('GetProductByIdUseCase', () => {
  let useCase: GetProductByIdUseCase;
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
  const images = [
    ProductImage.restore({
      id: 'image-1',
      imagePath: 'products/product-id/first.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      productId: 'product-id',
      variantId: null,
    }),
    ProductImage.restore({
      id: 'image-2',
      imagePath: 'products/product-id/second.jpg',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      deletedAt: null,
      productId: 'product-id',
      variantId: null,
    }),
  ];
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
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

    productRepository.getProductById.mockResolvedValue(product);
    productImageRepository.getActiveImagesByProductIds.mockResolvedValue([]);
    fileStorageService.getSignedUrl.mockImplementation((key) =>
      Promise.resolve(signedUrlFor(key)),
    );

    useCase = new GetProductByIdUseCase(
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
    it('returns the product with the default image when it has no images', async () => {
      const result = await useCase.execute('product-id', defaultImageUrl);

      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledWith(['product-id']);
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual({
        product,
        images: [
          {
            id: null,
            url: defaultImageUrl,
            expiresIn: null,
            isDefault: true,
          },
        ],
      });
      expect(result.product).toBe(product);
    });

    it('returns the product with a presigned url per image, in repository order, with the default ttl', async () => {
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue(
        images,
      );

      const result = await useCase.execute('product-id', defaultImageUrl);

      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        images[0].imagePath,
      );
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        images[1].imagePath,
      );
      expect(result).toEqual({
        product,
        images: [
          {
            id: 'image-1',
            url: signedUrlFor(images[0].imagePath),
            expiresIn: 3600,
            isDefault: false,
          },
          {
            id: 'image-2',
            url: signedUrlFor(images[1].imagePath),
            expiresIn: 3600,
            isDefault: false,
          },
        ],
      });
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue(
        images,
      );

      const result = await useCase.execute('product-id', defaultImageUrl);

      expect(result.images.map((image) => image.expiresIn)).toEqual([900, 900]);
    });

    it('translates a missing product into a NotFoundException without loading images', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      await expect(
        useCase.execute('product-id', defaultImageUrl),
      ).rejects.toThrow(NotFoundException);
      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product into a NotFoundException without loading images', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      await expect(
        useCase.execute('product-id', defaultImageUrl),
      ).rejects.toThrow(NotFoundException);
      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).not.toHaveBeenCalled();
    });

    it('translates unexpected errors into an InternalServerErrorException', async () => {
      productRepository.getProductById.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute('product-id', defaultImageUrl),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('translates a presign failure into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue(
        images,
      );
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('product-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'presign failed', details: [] },
      });
    });
  });
});
