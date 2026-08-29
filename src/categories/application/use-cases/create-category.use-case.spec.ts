import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';
import { CreateCategoryUseCase } from './create-category.use-case';

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new CreateCategoryUseCase(categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates and returns the category', async () => {
    const persistedCategory = Category.restore({
      id: 'category-id',
      name: 'T-Shirts',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    categoryRepository.createCategory.mockResolvedValue(persistedCategory);

    const result = await useCase.execute('T-Shirts');

    expect(categoryRepository.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'T-Shirts' }),
    );
    expect(result).toBe(persistedCategory);
  });

  it('translates CategoryAlreadyExistsError into a ConflictException', async () => {
    categoryRepository.createCategory.mockRejectedValue(
      new CategoryAlreadyExistsError('T-Shirts'),
    );

    await expect(useCase.execute('T-Shirts')).rejects.toThrow(
      ConflictException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.createCategory.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('T-Shirts')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
