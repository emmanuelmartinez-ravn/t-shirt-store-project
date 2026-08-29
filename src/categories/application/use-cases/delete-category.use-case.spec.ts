import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';
import { DeleteCategoryUseCase } from './delete-category.use-case';

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase;
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

    useCase = new DeleteCategoryUseCase(categoryRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes and returns the category', async () => {
    const persistedCategory = Category.restore({
      id: 'category-id',
      name: 'T-Shirts',
      createdAt: existingCategory.createdAt,
      updatedAt: existingCategory.updatedAt,
      deletedAt: new Date(),
    });
    categoryRepository.getCategoryById.mockResolvedValue(existingCategory);
    categoryRepository.deleteCategory.mockResolvedValue(persistedCategory);

    const result = await useCase.execute('category-id');

    const [deletedCategory] = categoryRepository.deleteCategory.mock.calls[0];
    expect(deletedCategory.id).toBe('category-id');
    expect(deletedCategory.deletedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedCategory);
  });

  it('translates a missing category into a NotFoundException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(null);

    await expect(useCase.execute('category-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(categoryRepository.deleteCategory).not.toHaveBeenCalled();
  });

  it('translates an already-deleted category into a GoneException', async () => {
    const alreadyDeletedCategory = Category.restore({
      id: 'category-id',
      name: 'T-Shirts',
      createdAt: existingCategory.createdAt,
      updatedAt: existingCategory.updatedAt,
      deletedAt: new Date(),
    });
    categoryRepository.getCategoryById.mockResolvedValue(
      alreadyDeletedCategory,
    );

    await expect(useCase.execute('category-id')).rejects.toThrow(GoneException);
    expect(categoryRepository.deleteCategory).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    categoryRepository.getCategoryById.mockResolvedValue(existingCategory);
    categoryRepository.deleteCategory.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('category-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
