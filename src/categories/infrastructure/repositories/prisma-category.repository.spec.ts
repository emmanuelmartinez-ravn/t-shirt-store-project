import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found';
import { Category } from '../../domain/models/category';
import { PrismaCategoryRepository } from './prisma-category.repository';

describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository;
  let prisma: {
    category: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const category = Category.restore({
    id: 'category-id',
    name: 'T-Shirts',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    prisma = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaCategoryRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('createCategory', () => {
    it('persists the category and returns the mapped domain entity', async () => {
      prisma.category.create.mockResolvedValue({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt: null,
      });

      const result = await repository.createCategory(category);

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
      });
      expect(result).toEqual(category);
    });

    it('translates a unique constraint violation into CategoryAlreadyExistsError', async () => {
      prisma.category.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.createCategory(category)).rejects.toThrow(
        CategoryAlreadyExistsError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.category.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createCategory(category)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getAllCategories', () => {
    it('returns all live categories mapped to domain entities', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: category.id,
          name: category.name,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          deletedAt: null,
        },
      ]);

      const result = await repository.getAllCategories();

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result).toEqual([category]);
    });
  });

  describe('updateCategory', () => {
    it('updates the category and returns the mapped domain entity', async () => {
      prisma.category.update.mockResolvedValue({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt: null,
      });

      const result = await repository.updateCategory(category);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: category.id },
        data: {
          name: category.name,
          updatedAt: category.updatedAt,
        },
      });
      expect(result).toEqual(category);
    });

    it('translates a unique constraint violation into CategoryAlreadyExistsError', async () => {
      prisma.category.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateCategory(category)).rejects.toThrow(
        CategoryAlreadyExistsError,
      );
    });

    it('translates a record-not-found error into CategoryNotFoundError', async () => {
      prisma.category.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateCategory(category)).rejects.toThrow(
        CategoryNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.category.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.updateCategory(category)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('deleteCategory', () => {
    it('soft-deletes the category and returns the mapped domain entity', async () => {
      const deletedCategory = Category.delete(category);
      prisma.category.update.mockResolvedValue({
        id: deletedCategory.id,
        name: deletedCategory.name,
        createdAt: deletedCategory.createdAt,
        updatedAt: deletedCategory.updatedAt,
        deletedAt: deletedCategory.deletedAt,
      });

      const result = await repository.deleteCategory(deletedCategory);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: deletedCategory.id },
        data: {
          updatedAt: deletedCategory.updatedAt,
          deletedAt: deletedCategory.deletedAt,
        },
      });
      expect(result).toEqual(deletedCategory);
    });

    it('translates a record-not-found error into CategoryNotFoundError', async () => {
      prisma.category.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.deleteCategory(category)).rejects.toThrow(
        CategoryNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.category.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.deleteCategory(category)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getCategoryById', () => {
    it('returns the mapped domain entity when the category exists', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getCategoryById('category-id');

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-id' },
      });
      expect(result).toEqual(category);
    });

    it('returns a soft-deleted category unchanged', async () => {
      const deletedAt = new Date();
      prisma.category.findUnique.mockResolvedValue({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt,
      });

      const result = await repository.getCategoryById('category-id');

      expect(result).toEqual(Category.restore({ ...category, deletedAt }));
    });

    it('returns null when no category matches the id', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const result = await repository.getCategoryById('missing');

      expect(result).toBeNull();
    });
  });
});
