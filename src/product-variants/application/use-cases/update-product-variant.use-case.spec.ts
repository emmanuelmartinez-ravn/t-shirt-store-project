import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { UpdateProductVariantUseCase } from './update-product-variant.use-case';

describe('UpdateProductVariantUseCase', () => {
  let useCase: UpdateProductVariantUseCase;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;

  const existingVariant = ProductVariant.restore({
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

  beforeEach(() => {
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getAllProductVariants: jest.fn(),
      getProductVariantById: jest.fn(),
      updateProductVariant: jest.fn(),
    };

    useCase = new UpdateProductVariantUseCase(productVariantRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('updates and returns the product variant', async () => {
      const persistedVariant = ProductVariant.restore({
        ...existingVariant,
        price: 29.99,
        stock: 50,
      });
      productVariantRepository.getProductVariantById.mockResolvedValue(
        existingVariant,
      );
      productVariantRepository.updateProductVariant.mockResolvedValue(
        persistedVariant,
      );

      const result = await useCase.execute('variant-id', {
        price: 29.99,
        stock: 50,
      });

      expect(
        productVariantRepository.updateProductVariant,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'variant-id',
          sku: existingVariant.sku,
          price: 29.99,
          stock: 50,
          attributes: existingVariant.attributes,
          productId: existingVariant.productId,
        }),
      );
      expect(result).toBe(persistedVariant);
    });

    it('translates a missing product variant into a NotFoundException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(null);

      await expect(
        useCase.execute('variant-id', { price: 29.99, stock: 50 }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(
        productVariantRepository.updateProductVariant,
      ).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product variant into a NotFoundException', async () => {
      const deletedVariant = ProductVariant.restore({
        ...existingVariant,
        deletedAt: new Date(),
      });
      productVariantRepository.getProductVariantById.mockResolvedValue(
        deletedVariant,
      );

      await expect(
        useCase.execute('variant-id', { price: 29.99, stock: 50 }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(
        productVariantRepository.updateProductVariant,
      ).not.toHaveBeenCalled();
    });

    it('translates an unexpected repository failure into an InternalServerErrorException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(
        existingVariant,
      );
      productVariantRepository.updateProductVariant.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute('variant-id', { price: 29.99, stock: 50 }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
    });
  });
});
