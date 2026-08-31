import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { Product } from '../../domain/models/product';
import { PrismaProductRepository } from './prisma-product.repository';

describe('PrismaProductRepository', () => {
  let repository: PrismaProductRepository;
  let prisma: {
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const product = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    description: 'A classic cotton t-shirt',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaProductRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('createProduct', () => {
    it('persists the product and returns the mapped domain entity', async () => {
      prisma.product.create.mockResolvedValue({
        id: product.id,
        name: product.name,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: null,
        categoryId: product.categoryId,
      });

      const result = await repository.createProduct(product);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          id: product.id,
          name: product.name,
          description: product.description,
          disabled: product.disabled,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          categoryId: product.categoryId,
        },
      });
      expect(result).toEqual(product);
    });

    it('translates a unique constraint violation into ProductAlreadyExistsError', async () => {
      prisma.product.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.createProduct(product)).rejects.toThrow(
        ProductAlreadyExistsError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.product.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createProduct(product)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getAllProducts', () => {
    beforeEach(() => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: product.id,
          name: product.name,
          description: product.description,
          disabled: product.disabled,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          deletedAt: null,
          categoryId: product.categoryId,
        },
      ]);
      prisma.product.count.mockResolvedValue(1);
    });

    it('returns the live products mapped to domain entities alongside the total count', async () => {
      const result = await repository.getAllProducts({ page: 1, limit: 20 });

      expect(result).toEqual({ items: [product], total: 1 });
    });

    it('filters out soft-deleted products on both findMany and count', async () => {
      await repository.getAllProducts({ page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('skips zero records on the first page', async () => {
      await repository.getAllProducts({ page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 20,
      });
    });

    it('skips the correct number of records on a later page', async () => {
      await repository.getAllProducts({ page: 2, limit: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('updateProduct', () => {
    it('updates the product and returns the mapped domain entity', async () => {
      prisma.product.update.mockResolvedValue({
        id: product.id,
        name: product.name,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: null,
        categoryId: product.categoryId,
      });

      const result = await repository.updateProduct(product);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: product.id },
        data: {
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          updatedAt: product.updatedAt,
        },
      });
      expect(result).toEqual(product);
    });

    it('translates a unique constraint violation into ProductAlreadyExistsError', async () => {
      prisma.product.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateProduct(product)).rejects.toThrow(
        ProductAlreadyExistsError,
      );
    });

    it('translates a record-not-found error into ProductNotFoundError', async () => {
      prisma.product.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateProduct(product)).rejects.toThrow(
        ProductNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.product.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.updateProduct(product)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('deleteProduct', () => {
    it('soft-deletes the product and returns the mapped domain entity', async () => {
      const deletedProduct = Product.delete(product);
      prisma.product.update.mockResolvedValue({
        id: deletedProduct.id,
        name: deletedProduct.name,
        description: deletedProduct.description,
        disabled: deletedProduct.disabled,
        createdAt: deletedProduct.createdAt,
        updatedAt: deletedProduct.updatedAt,
        deletedAt: deletedProduct.deletedAt,
        categoryId: deletedProduct.categoryId,
      });

      const result = await repository.deleteProduct(deletedProduct);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: deletedProduct.id },
        data: {
          updatedAt: deletedProduct.updatedAt,
          deletedAt: deletedProduct.deletedAt,
        },
      });
      expect(result).toEqual(deletedProduct);
    });

    it('translates a record-not-found error into ProductNotFoundError', async () => {
      prisma.product.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.deleteProduct(product)).rejects.toThrow(
        ProductNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.product.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.deleteProduct(product)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getProductById', () => {
    it('returns the mapped domain entity when the product exists', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: product.id,
        name: product.name,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: null,
        categoryId: product.categoryId,
      });

      const result = await repository.getProductById('product-id');

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-id' },
      });
      expect(result).toEqual(product);
    });

    it('returns null when no product matches the id', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await repository.getProductById('missing');

      expect(result).toBeNull();
    });
  });
});
