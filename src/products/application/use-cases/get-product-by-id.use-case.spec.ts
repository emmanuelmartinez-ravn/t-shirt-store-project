import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';

describe('GetProductByIdUseCase', () => {
  let useCase: GetProductByIdUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
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
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
  const imageUrls: ProductImageUrl[] = [
    {
      id: 'image-1',
      url: 'https://bucket.s3.amazonaws.com/products/product-id/first.png?signed',
      expiresIn: 3600,
      isDefault: false,
    },
  ];

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
    productImageUrlsService = {
      getImageUrls: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productRepository.getProductById.mockResolvedValue(product);
    productImageUrlsService.getImageUrls.mockResolvedValue(imageUrls);

    useCase = new GetProductByIdUseCase(
      productRepository,
      productImageUrlsService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('returns the product with its image list built with the default image url', async () => {
      const result = await useCase.execute('product-id', defaultImageUrl);

      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(productImageUrlsService.getImageUrls).toHaveBeenCalledWith(
        'product-id',
        defaultImageUrl,
      );
      expect(result).toEqual({ product, images: imageUrls });
      expect(result.product).toBe(product);
    });

    it('translates a missing product into a NotFoundException without loading images', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      const promise = useCase.execute('product-id', defaultImageUrl);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Product not found', details: [] },
      });
      expect(productImageUrlsService.getImageUrls).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product into a NotFoundException without loading images', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      await expect(
        useCase.execute('product-id', defaultImageUrl),
      ).rejects.toThrow(NotFoundException);
      expect(productImageUrlsService.getImageUrls).not.toHaveBeenCalled();
    });

    it('translates unexpected errors into an InternalServerErrorException', async () => {
      productRepository.getProductById.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute('product-id', defaultImageUrl),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('translates an image list failure into an InternalServerErrorException carrying its message', async () => {
      productImageUrlsService.getImageUrls.mockRejectedValue(
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
