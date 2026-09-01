import { Request } from 'express';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { Product } from '../../domain/models/product';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { GetAllProductsUseCase } from '../../application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from '../../application/use-cases/get-product-by-id.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { ProductsResponseMapper } from '../mappers/products-response.mapper';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;
  let getAllProductsUseCase: jest.Mocked<GetAllProductsUseCase>;
  let getProductByIdUseCase: jest.Mocked<GetProductByIdUseCase>;
  let updateProductUseCase: jest.Mocked<UpdateProductUseCase>;
  let deleteProductUseCase: jest.Mocked<DeleteProductUseCase>;

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
    createProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProductUseCase>;
    getAllProductsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllProductsUseCase>;
    getProductByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetProductByIdUseCase>;
    updateProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProductUseCase>;
    deleteProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductUseCase>;

    controller = new ProductsController(
      createProductUseCase,
      getAllProductsUseCase,
      getProductByIdUseCase,
      updateProductUseCase,
      deleteProductUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProduct', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      createProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.createProduct({
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });

    it('defaults a missing description to null', async () => {
      createProductUseCase.execute.mockResolvedValue(product);

      await controller.createProduct({
        name: 'Classic Tee',
        categoryId: 'category-id',
      });

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      });
    });
  });

  describe('getAllProducts', () => {
    it('delegates to the use case with disabled: false and the query params, and returns the mapped paginated response', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        items: [product],
        total: 1,
      });

      const result = await controller.getAllProducts({
        page: 1,
        limit: 20,
        name: 'shirt',
        categoryId: 'category-id',
      });

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        name: 'shirt',
        categoryId: 'category-id',
        disabled: false,
      });
      expect(result).toEqual({
        data: [ProductsResponseMapper.toResponse(product)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getLikedProducts', () => {
    const req = {
      user: {
        sub: 'user-id',
        email: 'joe.doe@example.com',
        role: 'client',
        roleId: 'role-id',
      },
    } as unknown as Request;

    it('delegates to the use case with disabled: false, liked: true, the authenticated userId, and the query params, and returns the mapped paginated response', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        items: [product],
        total: 1,
      });

      const result = await controller.getLikedProducts(req, {
        page: 1,
        limit: 20,
        name: 'shirt',
        categoryId: 'category-id',
      });

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        name: 'shirt',
        categoryId: 'category-id',
        disabled: false,
        liked: true,
        userId: 'user-id',
      });
      expect(result).toEqual({
        data: [ProductsResponseMapper.toResponse(product)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getProductById', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      getProductByIdUseCase.execute.mockResolvedValue(product);

      const result = await controller.getProductById('product-id');

      expect(getProductByIdUseCase.execute).toHaveBeenCalledWith('product-id');
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });
  });

  describe('updateProduct', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      updateProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.updateProduct('product-id', {
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(updateProductUseCase.execute).toHaveBeenCalledWith('product-id', {
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });

    it('defaults a missing description to null', async () => {
      updateProductUseCase.execute.mockResolvedValue(product);

      await controller.updateProduct('product-id', {
        name: 'Classic Tee',
        categoryId: 'category-id',
      });

      expect(updateProductUseCase.execute).toHaveBeenCalledWith('product-id', {
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      });
    });
  });

  describe('deleteProduct', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      deleteProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.deleteProduct('product-id');

      expect(deleteProductUseCase.execute).toHaveBeenCalledWith('product-id');
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });
  });
});
