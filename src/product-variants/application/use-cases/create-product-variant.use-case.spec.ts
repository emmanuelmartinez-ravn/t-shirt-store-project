import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Product } from '../../../products/domain/models/product';
import { ProductRepository } from '../../../products/infrastructure/repositories/product.repository';
import { ProductVariantAlreadyExistsError } from '../../domain/errors/product-variant-already-exists';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { CreateProductVariantUseCase } from './create-product-variant.use-case';

describe('CreateProductVariantUseCase', () => {
  let useCase: CreateProductVariantUseCase;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let productRepository: jest.Mocked<ProductRepository>;

  const product = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    code: 'TS-000001',
    description: 'A classic cotton t-shirt',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });

  beforeEach(() => {
    productVariantRepository = {
      createProductVariant: jest.fn(),
    };
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
      getLastProductCode: jest.fn(),
    };

    useCase = new CreateProductVariantUseCase(
      productVariantRepository,
      productRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('creates and returns the product variant with a generated sku', async () => {
      const persistedVariant = ProductVariant.restore({
        id: 'variant-id',
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        disabled: false,
        attributes: { size: 'medium', color: 'blue' },
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        productId: 'product-id',
      });
      productRepository.getProductById.mockResolvedValue(product);
      productVariantRepository.createProductVariant.mockResolvedValue(
        persistedVariant,
      );

      const result = await useCase.execute({
        productId: 'product-id',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
      });

      expect(
        productVariantRepository.createProductVariant,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'TS-000001-MED-BLU',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium', color: 'blue' },
          productId: 'product-id',
        }),
      );
      expect(result).toBe(persistedVariant);
    });

    it('translates a missing product into a NotFoundException', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          productId: 'product-id',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium' },
        }),
      ).rejects.toThrow(
        new NotFoundException({ error: 'Product not found', details: [] }),
      );
      expect(
        productVariantRepository.createProductVariant,
      ).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product into a NotFoundException', async () => {
      const deletedProduct = Product.restore({
        ...product,
        deletedAt: new Date(),
      });
      productRepository.getProductById.mockResolvedValue(deletedProduct);

      await expect(
        useCase.execute({
          productId: 'product-id',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium' },
        }),
      ).rejects.toThrow(
        new NotFoundException({ error: 'Product not found', details: [] }),
      );
      expect(
        productVariantRepository.createProductVariant,
      ).not.toHaveBeenCalled();
    });

    it('translates ProductVariantAlreadyExistsError into a ConflictException', async () => {
      productRepository.getProductById.mockResolvedValue(product);
      productVariantRepository.createProductVariant.mockRejectedValue(
        new ProductVariantAlreadyExistsError('TS-000001-MED-BLU'),
      );

      await expect(
        useCase.execute({
          productId: 'product-id',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium', color: 'blue' },
        }),
      ).rejects.toThrow(
        new ConflictException({
          error: 'Product variant already exists',
          details: ['sku must be unique'],
        }),
      );
    });

    it('translates an unexpected getProductById failure into an InternalServerErrorException', async () => {
      productRepository.getProductById.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({
          productId: 'product-id',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium' },
        }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
      expect(
        productVariantRepository.createProductVariant,
      ).not.toHaveBeenCalled();
    });

    it('translates an unexpected createProductVariant failure into an InternalServerErrorException', async () => {
      productRepository.getProductById.mockResolvedValue(product);
      productVariantRepository.createProductVariant.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({
          productId: 'product-id',
          price: 19.99,
          stock: 100,
          attributes: { size: 'medium', color: 'blue' },
        }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
    });
  });
});
