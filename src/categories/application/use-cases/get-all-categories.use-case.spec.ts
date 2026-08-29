import { InternalServerErrorException } from '@nestjs/common';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';
import { GetAllCategoriesUseCase } from './get-all-categories.use-case';

describe('GetAllCategoriesUseCase', () => {
  let useCase: GetAllCategoriesUseCase;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    categoryRepository = {
      createCategory: jest.fn(),
      getAllCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryById: jest.fn(),
    };

    useCase = new GetAllCategoriesUseCase(categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns all categories', async () => {
    const categories = [
      Category.restore({
        id: 'category-id',
        name: 'T-Shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    ];
    categoryRepository.getAllCategories.mockResolvedValue(categories);

    const result = await useCase.execute();

    expect(result).toBe(categories);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.getAllCategories.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
