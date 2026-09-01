import { InternalServerErrorException } from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { GetAllProductsUseCase } from './get-all-products.use-case';

describe('GetAllProductsUseCase', () => {
  let useCase: GetAllProductsUseCase;
  let productRepository: jest.Mocked<ProductRepository>;

  const products = [
    Product.restore({
      id: 'product-id',
      name: 'Classic Tee',
      code: 'TS-000001',
      description: null,
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      categoryId: 'category-id',
    }),
  ];

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
      getLastProductCode: jest.fn(),
    };

    useCase = new GetAllProductsUseCase(productRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the paginated products', async () => {
    productRepository.getAllProducts.mockResolvedValue({
      items: products,
      total: products.length,
    });

    const result = await useCase.execute({
      page: 1,
      limit: 20,
      disabled: false,
    });

    expect(result).toEqual({ items: products, total: products.length });
  });

  it('passes the params through unchanged to the repository, including optional filters', async () => {
    productRepository.getAllProducts.mockResolvedValue({
      items: products,
      total: products.length,
    });
    const params = {
      page: 2,
      limit: 10,
      name: 'shirt',
      categoryId: 'category-id',
      disabled: true,
      liked: true,
      userId: 'user-id',
    };

    await useCase.execute(params);

    expect(productRepository.getAllProducts).toHaveBeenCalledWith(params);
  });

  it('passes the params through unchanged to the repository when optional filters are omitted', async () => {
    productRepository.getAllProducts.mockResolvedValue({
      items: products,
      total: products.length,
    });
    const params = { page: 1, limit: 20, disabled: false };

    await useCase.execute(params);

    expect(productRepository.getAllProducts).toHaveBeenCalledWith(params);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getAllProducts.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute({ page: 1, limit: 20, disabled: false }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
