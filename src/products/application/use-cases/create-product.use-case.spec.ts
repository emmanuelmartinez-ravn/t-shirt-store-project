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
import { CreateProductUseCase } from './create-product.use-case';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  const category = Category.restore({
    id: 'category-id',
    name: 'T-Shirts',
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
      getProductById: jest.fn(),
    };
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new CreateProductUseCase(productRepository, categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates and returns the product', async () => {
    const persistedProduct = Product.restore({
      id: 'product-id',
      name: 'Classic Tee',
      description: 'A classic cotton t-shirt',
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      categoryId: 'category-id',
    });
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.createProduct.mockResolvedValue(persistedProduct);

    const result = await useCase.execute({
      name: 'Classic Tee',
      description: 'A classic cotton t-shirt',
      categoryId: 'category-id',
    });

    expect(productRepository.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      }),
    );
    expect(result).toBe(persistedProduct);
  });

  it('translates a missing category into a NotFoundException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(productRepository.createProduct).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted category into a NotFoundException', async () => {
    const deletedCategory = Category.restore({
      ...category,
      deletedAt: new Date(),
    });
    categoryRepository.getCategoryById.mockResolvedValue(deletedCategory);

    await expect(
      useCase.execute({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(productRepository.createProduct).not.toHaveBeenCalled();
  });

  it('translates ProductAlreadyExistsError into a ConflictException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.createProduct.mockRejectedValue(
      new ProductAlreadyExistsError('Classic Tee'),
    );

    await expect(
      useCase.execute({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(category);
    productRepository.createProduct.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
