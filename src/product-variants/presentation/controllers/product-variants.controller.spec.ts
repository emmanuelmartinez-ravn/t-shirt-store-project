import { CreateProductVariantUseCase } from '../../application/use-cases/create-product-variant.use-case';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantResponseMapper } from '../mappers/product-variant-response.mapper';
import { ProductVariantsController } from './product-variants.controller';

describe('ProductVariantsController', () => {
  let controller: ProductVariantsController;
  let createProductVariantUseCase: jest.Mocked<CreateProductVariantUseCase>;

  const variant = ProductVariant.restore({
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
    createProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProductVariantUseCase>;

    controller = new ProductVariantsController(createProductVariantUseCase);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProductVariant', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      createProductVariantUseCase.execute.mockResolvedValue(variant);

      const result = await controller.createProductVariant({
        productId: 'product-id',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
      });

      expect(createProductVariantUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-id',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
      });
      expect(result).toEqual(ProductVariantResponseMapper.toResponse(variant));
    });
  });
});
