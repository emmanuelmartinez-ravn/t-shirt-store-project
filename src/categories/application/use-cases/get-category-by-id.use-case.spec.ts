import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';
import { GetCategoryByIdUseCase } from './get-category-by-id.use-case';

describe('GetCategoryByIdUseCase', () => {
  let useCase: GetCategoryByIdUseCase;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new GetCategoryByIdUseCase(categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the category when it exists', async () => {
    const category = Category.restore({
      id: 'category-id',
      name: 'T-Shirts',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    categoryRepository.getCategoryById.mockResolvedValue(category);

    const result = await useCase.execute('category-id');

    expect(categoryRepository.getCategoryById).toHaveBeenCalledWith(
      'category-id',
    );
    expect(result).toBe(category);
  });

  it('returns a soft-deleted category instead of treating it as missing', async () => {
    const deletedCategory = Category.restore({
      id: 'category-id',
      name: 'T-Shirts',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    });
    categoryRepository.getCategoryById.mockResolvedValue(deletedCategory);

    const result = await useCase.execute('category-id');

    expect(result).toBe(deletedCategory);
  });

  it('translates a missing category into a NotFoundException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(null);

    await expect(useCase.execute('category-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.getCategoryById.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('category-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
