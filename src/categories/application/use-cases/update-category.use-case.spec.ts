import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';
import { UpdateCategoryUseCase } from './update-category.use-case';

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  const existingCategory = Category.restore({
    id: 'category-id',
    name: 'T-Shirts',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new UpdateCategoryUseCase(categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates and returns the category', async () => {
    const persistedCategory = Category.restore({
      id: 'category-id',
      name: 'Hoodies',
      createdAt: existingCategory.createdAt,
      updatedAt: new Date(),
      deletedAt: null,
    });
    categoryRepository.getCategoryById.mockResolvedValue(existingCategory);
    categoryRepository.updateCategory.mockResolvedValue(persistedCategory);

    const result = await useCase.execute('category-id', 'Hoodies');

    expect(categoryRepository.updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'category-id', name: 'Hoodies' }),
    );
    expect(result).toBe(persistedCategory);
  });

  it('translates a missing category into a NotFoundException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(null);

    await expect(useCase.execute('category-id', 'Hoodies')).rejects.toThrow(
      NotFoundException,
    );
    expect(categoryRepository.updateCategory).not.toHaveBeenCalled();
  });

  it('translates CategoryAlreadyExistsError into a ConflictException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(existingCategory);
    categoryRepository.updateCategory.mockRejectedValue(
      new CategoryAlreadyExistsError('Hoodies'),
    );

    await expect(useCase.execute('category-id', 'Hoodies')).rejects.toThrow(
      ConflictException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(existingCategory);
    categoryRepository.updateCategory.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('category-id', 'Hoodies')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
