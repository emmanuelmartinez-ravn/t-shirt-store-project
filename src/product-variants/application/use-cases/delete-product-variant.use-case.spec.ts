import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { DeleteProductVariantUseCase } from './delete-product-variant.use-case';

describe('DeleteProductVariantUseCase', () => {
  let useCase: DeleteProductVariantUseCase;
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
      deleteProductVariant: jest.fn(),
    };

    useCase = new DeleteProductVariantUseCase(productVariantRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes and returns the product variant', async () => {
    const persistedVariant = ProductVariant.restore({
      ...existingVariant,
      deletedAt: new Date(),
    });
    productVariantRepository.getProductVariantById.mockResolvedValue(
      existingVariant,
    );
    productVariantRepository.deleteProductVariant.mockResolvedValue(
      persistedVariant,
    );

    const result = await useCase.execute('variant-id');

    const [deletedVariant] =
      productVariantRepository.deleteProductVariant.mock.calls[0];
    expect(deletedVariant.id).toBe('variant-id');
    expect(deletedVariant.deletedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedVariant);
  });

  it('translates a missing product variant into a NotFoundException', async () => {
    productVariantRepository.getProductVariantById.mockResolvedValue(null);

    await expect(useCase.execute('variant-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(
      productVariantRepository.deleteProductVariant,
    ).not.toHaveBeenCalled();
  });

  it('translates an already-deleted product variant into a GoneException', async () => {
    const alreadyDeletedVariant = ProductVariant.restore({
      ...existingVariant,
      deletedAt: new Date(),
    });
    productVariantRepository.getProductVariantById.mockResolvedValue(
      alreadyDeletedVariant,
    );

    await expect(useCase.execute('variant-id')).rejects.toThrow(GoneException);
    expect(
      productVariantRepository.deleteProductVariant,
    ).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productVariantRepository.getProductVariantById.mockResolvedValue(
      existingVariant,
    );
    productVariantRepository.deleteProductVariant.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('variant-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
