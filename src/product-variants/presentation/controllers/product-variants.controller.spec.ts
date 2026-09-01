import { Request } from 'express';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { CreateProductVariantUseCase } from '../../application/use-cases/create-product-variant.use-case';
import { GetAllProductVariantsUseCase } from '../../application/use-cases/get-all-product-variants.use-case';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantResponseMapper } from '../mappers/product-variant-response.mapper';
import { ProductVariantsController } from './product-variants.controller';

describe('ProductVariantsController', () => {
  let controller: ProductVariantsController;
  let createProductVariantUseCase: jest.Mocked<CreateProductVariantUseCase>;
  let getAllProductVariantsUseCase: jest.Mocked<GetAllProductVariantsUseCase>;

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
    getAllProductVariantsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllProductVariantsUseCase>;

    controller = new ProductVariantsController(
      createProductVariantUseCase,
      getAllProductVariantsUseCase,
    );
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

  describe('getAllProductVariants', () => {
    it('delegates to the use case with the productId, disabled: false and the query params, and returns the mapped paginated response', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue({
        items: [variant],
        total: 1,
      });

      const result = await controller.getAllProductVariants('product-id', {
        page: 1,
        limit: 20,
      });

      expect(getAllProductVariantsUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-id',
        page: 1,
        limit: 20,
        disabled: false,
      });
      expect(result).toEqual({
        data: [ProductVariantResponseMapper.toResponse(variant)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getLikedProductVariants', () => {
    const req = {
      user: {
        sub: 'user-id',
        email: 'joe.doe@example.com',
        role: 'client',
        roleId: 'role-id',
      },
    } as unknown as Request;

    it('delegates to the use case with the productId, disabled: false, liked: true, the authenticated userId, and the query params, and returns the mapped paginated response', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue({
        items: [variant],
        total: 1,
      });

      const result = await controller.getLikedProductVariants(
        'product-id',
        req,
        { page: 1, limit: 20 },
      );

      expect(getAllProductVariantsUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-id',
        page: 1,
        limit: 20,
        disabled: false,
        liked: true,
        userId: 'user-id',
      });
      expect(result).toEqual({
        data: [ProductVariantResponseMapper.toResponse(variant)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getDisabledProductVariants', () => {
    it('delegates to the use case with the productId, disabled: true and the query params, and returns the mapped paginated response', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue({
        items: [variant],
        total: 1,
      });

      const result = await controller.getDisabledProductVariants('product-id', {
        page: 1,
        limit: 20,
      });

      expect(getAllProductVariantsUseCase.execute).toHaveBeenCalledWith({
        productId: 'product-id',
        page: 1,
        limit: 20,
        disabled: true,
      });
      expect(result).toEqual({
        data: [ProductVariantResponseMapper.toResponse(variant)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });
});
