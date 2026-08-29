import { InternalServerErrorException } from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { GetAllProductsUseCase } from './get-all-products.use-case';

describe('GetAllProductsUseCase', () => {
  let useCase: GetAllProductsUseCase;
  let productRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
    };

    useCase = new GetAllProductsUseCase(productRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns all products', async () => {
    const products = [
      Product.restore({
        id: 'product-id',
        name: 'Classic Tee',
        description: null,
        disabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        categoryId: 'category-id',
      }),
    ];
    productRepository.getAllProducts.mockResolvedValue(products);

    const result = await useCase.execute();

    expect(result).toBe(products);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getAllProducts.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
