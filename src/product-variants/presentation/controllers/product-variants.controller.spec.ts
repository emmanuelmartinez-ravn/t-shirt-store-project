import { Request } from 'express';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { ProductImageUrl } from '../../../products/application/types/product-image-url';
import { CreateProductVariantUseCase } from '../../application/use-cases/create-product-variant.use-case';
import { DeleteProductVariantUseCase } from '../../application/use-cases/delete-product-variant.use-case';
import { GetAllProductVariantsUseCase } from '../../application/use-cases/get-all-product-variants.use-case';
import { UpdateProductVariantUseCase } from '../../application/use-cases/update-product-variant.use-case';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantResponseMapper } from '../mappers/product-variant-response.mapper';
import { ProductVariantsController } from './product-variants.controller';

describe('ProductVariantsController', () => {
  let controller: ProductVariantsController;
  let createProductVariantUseCase: jest.Mocked<CreateProductVariantUseCase>;
  let getAllProductVariantsUseCase: jest.Mocked<GetAllProductVariantsUseCase>;
  let updateProductVariantUseCase: jest.Mocked<UpdateProductVariantUseCase>;
  let deleteProductVariantUseCase: jest.Mocked<DeleteProductVariantUseCase>;

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
  const otherVariant = ProductVariant.restore({
    ...variant,
    id: 'other-variant-id',
    sku: 'TS-000001-LRG-RED',
    attributes: { size: 'large', color: 'red' },
  });
  const image: ProductImageUrl = {
    id: 'image-id',
    url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
    expiresIn: 3600,
    isDefault: false,
    variantId: 'variant-id',
  };
  const variantsWithImages = {
    items: [
      { variant, images: [image] },
      { variant: otherVariant, images: [] },
    ],
    total: 2,
  };
  const expectedPaginatedResponse = {
    data: [
      ProductVariantResponseMapper.toResponse(variant, [image]),
      ProductVariantResponseMapper.toResponse(otherVariant, []),
    ],
    pagination: PaginationMapper.buildMeta(1, 20, 2),
  };
  const expectedImageResponses = [
    {
      id: 'image-id',
      url: image.url,
      expiresIn: 3600,
      isDefault: false,
      variantId: 'variant-id',
    },
  ];

  beforeEach(() => {
    createProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProductVariantUseCase>;
    getAllProductVariantsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllProductVariantsUseCase>;
    updateProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProductVariantUseCase>;
    deleteProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductVariantUseCase>;

    controller = new ProductVariantsController(
      createProductVariantUseCase,
      getAllProductVariantsUseCase,
      updateProductVariantUseCase,
      deleteProductVariantUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProductVariant', () => {
    it('delegates to the use case and returns the mapped response without images', async () => {
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
      expect(result).not.toHaveProperty('images');
    });
  });

  describe('getAllProductVariants', () => {
    it('delegates to the use case with the productId, disabled: false and the query params, and returns the mapped paginated response', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

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
      expect(result).toEqual(expectedPaginatedResponse);
    });

    it('includes the images of each variant, or an empty list when it has none', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

      const result = await controller.getAllProductVariants('product-id', {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].images).toEqual(expectedImageResponses);
      expect(result.data[1].images).toEqual([]);
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
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

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
      expect(result).toEqual(expectedPaginatedResponse);
    });

    it('includes the images of each variant, or an empty list when it has none', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

      const result = await controller.getLikedProductVariants(
        'product-id',
        req,
        { page: 1, limit: 20 },
      );

      expect(result.data[0].images).toEqual(expectedImageResponses);
      expect(result.data[1].images).toEqual([]);
    });
  });

  describe('getDisabledProductVariants', () => {
    it('delegates to the use case with the productId, disabled: true and the query params, and returns the mapped paginated response', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

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
      expect(result).toEqual(expectedPaginatedResponse);
    });

    it('includes the images of each variant, or an empty list when it has none', async () => {
      getAllProductVariantsUseCase.execute.mockResolvedValue(
        variantsWithImages,
      );

      const result = await controller.getDisabledProductVariants('product-id', {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].images).toEqual(expectedImageResponses);
      expect(result.data[1].images).toEqual([]);
    });
  });

  describe('updateProductVariant', () => {
    it('delegates to the use case with the price and stock, and returns the mapped response without images', async () => {
      const updatedVariant = ProductVariant.restore({
        ...variant,
        price: 29.99,
        stock: 50,
      });
      updateProductVariantUseCase.execute.mockResolvedValue(updatedVariant);

      const result = await controller.updateProductVariant('variant-id', {
        price: 29.99,
        stock: 50,
      });

      expect(updateProductVariantUseCase.execute).toHaveBeenCalledWith(
        'variant-id',
        { price: 29.99, stock: 50 },
      );
      expect(result).toEqual(
        ProductVariantResponseMapper.toResponse(updatedVariant),
      );
      expect(result).not.toHaveProperty('images');
    });
  });

  describe('deleteProductVariant', () => {
    it('delegates to the use case with the id and returns the mapped response without images', async () => {
      const deletedVariant = ProductVariant.restore({
        ...variant,
        deletedAt: new Date(),
      });
      deleteProductVariantUseCase.execute.mockResolvedValue(deletedVariant);

      const result = await controller.deleteProductVariant('variant-id');

      expect(deleteProductVariantUseCase.execute).toHaveBeenCalledWith(
        'variant-id',
      );
      expect(result).toEqual(
        ProductVariantResponseMapper.toResponse(deletedVariant),
      );
      expect(result).not.toHaveProperty('images');
    });
  });
});
