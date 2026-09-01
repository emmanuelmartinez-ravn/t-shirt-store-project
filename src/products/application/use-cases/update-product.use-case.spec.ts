import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '../../../categories/domain/models/category';
import { CategoryRepository } from '../../../categories/infrastructure/repositories/category.repository';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { UpdateProductUseCase } from './update-product.use-case';

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  const existingProduct = Product.restore({
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

  const category = Category.restore({
    id: 'new-category-id',
    name: 'Hoodies',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

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
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new UpdateProductUseCase(productRepository, categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates and returns the product', async () => {
    const persistedProduct = Product.restore({
      ...existingProduct,
      name: 'Premium Tee',
      categoryId: 'new-category-id',
    });
    productRepository.getProductById.mockResolvedValue(existingProduct);
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.updateProduct.mockResolvedValue(persistedProduct);

    const result = await useCase.execute('product-id', {
      name: 'Premium Tee',
      description: 'A classic cotton t-shirt',
      categoryId: 'new-category-id',
    });

    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'product-id',
        name: 'Premium Tee',
        categoryId: 'new-category-id',
      }),
    );
    expect(result).toBe(persistedProduct);
  });

  it('translates a missing product into a NotFoundException', async () => {
    productRepository.getProductById.mockResolvedValue(null);

    await expect(
      useCase.execute('product-id', {
        name: 'Premium Tee',
        description: null,
        categoryId: 'new-category-id',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(productRepository.updateProduct).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted product into a NotFoundException', async () => {
    const deletedProduct = Product.restore({
      ...existingProduct,
      deletedAt: new Date(),
    });
    productRepository.getProductById.mockResolvedValue(deletedProduct);

    await expect(
      useCase.execute('product-id', {
        name: 'Premium Tee',
        description: null,
        categoryId: 'new-category-id',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(productRepository.updateProduct).not.toHaveBeenCalled();
  });

  it('translates a missing category into a NotFoundException', async () => {
    productRepository.getProductById.mockResolvedValue(existingProduct);
    categoryRepository.getCategoryById.mockResolvedValue(null);

    await expect(
      useCase.execute('product-id', {
        name: 'Premium Tee',
        description: null,
        categoryId: 'new-category-id',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(productRepository.updateProduct).not.toHaveBeenCalled();
  });

  it('translates ProductAlreadyExistsError into a ConflictException', async () => {
    productRepository.getProductById.mockResolvedValue(existingProduct);
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.updateProduct.mockRejectedValue(
      new ProductAlreadyExistsError('Premium Tee'),
    );

    await expect(
      useCase.execute('product-id', {
        name: 'Premium Tee',
        description: null,
        categoryId: 'new-category-id',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getProductById.mockResolvedValue(existingProduct);
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.updateProduct.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute('product-id', {
        name: 'Premium Tee',
        description: null,
        categoryId: 'new-category-id',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
