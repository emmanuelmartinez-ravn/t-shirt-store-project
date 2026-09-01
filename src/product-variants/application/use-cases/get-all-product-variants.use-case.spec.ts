import { InternalServerErrorException } from '@nestjs/common';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { GetAllProductVariantsUseCase } from './get-all-product-variants.use-case';

describe('GetAllProductVariantsUseCase', () => {
  let useCase: GetAllProductVariantsUseCase;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;

  const variants = [
    ProductVariant.restore({
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
    }),
  ];

  beforeEach(() => {
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getAllProductVariants: jest.fn(),
      getProductVariantById: jest.fn(),
    };

    useCase = new GetAllProductVariantsUseCase(productVariantRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the paginated product variants', async () => {
    productVariantRepository.getAllProductVariants.mockResolvedValue({
      items: variants,
      total: variants.length,
    });

    const result = await useCase.execute({
      productId: 'product-id',
      page: 1,
      limit: 20,
      disabled: false,
    });

    expect(result).toEqual({ items: variants, total: variants.length });
  });

  it('passes the params through unchanged to the repository, including optional filters', async () => {
    productVariantRepository.getAllProductVariants.mockResolvedValue({
      items: variants,
      total: variants.length,
    });
    const params = {
      productId: 'product-id',
      page: 2,
      limit: 10,
      disabled: true,
      liked: true,
      userId: 'user-id',
    };

    await useCase.execute(params);

    expect(productVariantRepository.getAllProductVariants).toHaveBeenCalledWith(
      params,
    );
  });

  it('passes the params through unchanged to the repository when optional filters are omitted', async () => {
    productVariantRepository.getAllProductVariants.mockResolvedValue({
      items: variants,
      total: variants.length,
    });
    const params = {
      productId: 'product-id',
      page: 1,
      limit: 20,
      disabled: false,
    };

    await useCase.execute(params);

    expect(productVariantRepository.getAllProductVariants).toHaveBeenCalledWith(
      params,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productVariantRepository.getAllProductVariants.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute({
        productId: 'product-id',
        page: 1,
        limit: 20,
        disabled: false,
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
