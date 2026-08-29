import { Category } from '../../domain/models/category';
import { CreateCategoryUseCase } from '../../application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from '../../application/use-cases/delete-category.use-case';
import { GetAllCategoriesUseCase } from '../../application/use-cases/get-all-categories.use-case';
import { GetCategoryByIdUseCase } from '../../application/use-cases/get-category-by-id.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/update-category.use-case';
import { CategoriesResponseMapper } from '../mappers/categories-response.mapper';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let createCategoryUseCase: jest.Mocked<CreateCategoryUseCase>;
  let getAllCategoriesUseCase: jest.Mocked<GetAllCategoriesUseCase>;
  let getCategoryByIdUseCase: jest.Mocked<GetCategoryByIdUseCase>;
  let updateCategoryUseCase: jest.Mocked<UpdateCategoryUseCase>;
  let deleteCategoryUseCase: jest.Mocked<DeleteCategoryUseCase>;

  beforeEach(() => {
    createCategoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateCategoryUseCase>;
    getAllCategoriesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllCategoriesUseCase>;
    getCategoryByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCategoryByIdUseCase>;
    updateCategoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateCategoryUseCase>;
    deleteCategoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteCategoryUseCase>;

    controller = new CategoriesController(
      createCategoryUseCase,
      getAllCategoriesUseCase,
      getCategoryByIdUseCase,
      updateCategoryUseCase,
      deleteCategoryUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCategory', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const category = Category.restore({
        id: 'category-id',
        name: 'T-Shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      createCategoryUseCase.execute.mockResolvedValue(category);

      const result = await controller.createCategory({ name: 'T-Shirts' });

      expect(createCategoryUseCase.execute).toHaveBeenCalledWith('T-Shirts');
      expect(result).toEqual(CategoriesResponseMapper.toResponse(category));
    });
  });

  describe('getAllCategories', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const category = Category.restore({
        id: 'category-id',
        name: 'T-Shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      getAllCategoriesUseCase.execute.mockResolvedValue([category]);

      const result = await controller.getAllCategories();

      expect(getAllCategoriesUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual([CategoriesResponseMapper.toResponse(category)]);
    });
  });

  describe('getCategoryById', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const category = Category.restore({
        id: 'category-id',
        name: 'T-Shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      getCategoryByIdUseCase.execute.mockResolvedValue(category);

      const result = await controller.getCategoryById('category-id');

      expect(getCategoryByIdUseCase.execute).toHaveBeenCalledWith(
        'category-id',
      );
      expect(result).toEqual(CategoriesResponseMapper.toResponse(category));
    });
  });

  describe('updateCategory', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const category = Category.restore({
        id: 'category-id',
        name: 'Hoodies',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      updateCategoryUseCase.execute.mockResolvedValue(category);

      const result = await controller.updateCategory('category-id', {
        name: 'Hoodies',
      });

      expect(updateCategoryUseCase.execute).toHaveBeenCalledWith(
        'category-id',
        'Hoodies',
      );
      expect(result).toEqual(CategoriesResponseMapper.toResponse(category));
    });
  });

  describe('deleteCategory', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const category = Category.restore({
        id: 'category-id',
        name: 'T-Shirts',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      });
      deleteCategoryUseCase.execute.mockResolvedValue(category);

      const result = await controller.deleteCategory('category-id');

      expect(deleteCategoryUseCase.execute).toHaveBeenCalledWith('category-id');
      expect(result).toEqual(CategoriesResponseMapper.toResponse(category));
    });
  });
});
