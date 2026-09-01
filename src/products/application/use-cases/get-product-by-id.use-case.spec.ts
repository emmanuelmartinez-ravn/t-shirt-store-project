import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { GetProductByIdUseCase } from './get-product-by-id.use-case';

describe('GetProductByIdUseCase', () => {
  let useCase: GetProductByIdUseCase;
  let productRepository: jest.Mocked<ProductRepository>;

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      setDisabled: jest.fn(),
      getProductById: jest.fn(),
      getLastProductCode: jest.fn(),
    };

    useCase = new GetProductByIdUseCase(productRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the product when it exists and is live', async () => {
    const product = Product.restore({
      id: 'product-id',
      name: 'Classic Tee',
      code: 'TS-000001',
      description: null,
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      categoryId: 'category-id',
    });
    productRepository.getProductById.mockResolvedValue(product);

    const result = await useCase.execute('product-id');

    expect(productRepository.getProductById).toHaveBeenCalledWith('product-id');
    expect(result).toBe(product);
  });

  it('translates a missing product into a NotFoundException', async () => {
    productRepository.getProductById.mockResolvedValue(null);

    await expect(useCase.execute('product-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('translates a soft-deleted product into a NotFoundException', async () => {
    const deletedProduct = Product.restore({
      id: 'product-id',
      name: 'Classic Tee',
      code: 'TS-000001',
      description: null,
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
      categoryId: 'category-id',
    });
    productRepository.getProductById.mockResolvedValue(deletedProduct);

    await expect(useCase.execute('product-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getProductById.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('product-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
