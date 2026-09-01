import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
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
      findFirst: jest.Mock;
    };
    productVariant: {
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const product = Product.restore({
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

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      productVariant: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
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
        code: product.code,
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
          code: product.code,
          description: product.description,
          disabled: product.disabled,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          categoryId: product.categoryId,
        },
      });
      expect(result).toEqual(product);
    });

    it('translates a unique constraint violation on the name into ProductAlreadyExistsError', async () => {
      prisma.product.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['name'] },
        }),
      );

      await expect(repository.createProduct(product)).rejects.toThrow(
        ProductAlreadyExistsError,
      );
    });

    it('rethrows a unique constraint violation on the code unchanged', async () => {
      const codeCollisionError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['code'] },
        },
      );
      prisma.product.create.mockRejectedValue(codeCollisionError);

      await expect(repository.createProduct(product)).rejects.toThrow(
        codeCollisionError,
      );
      await expect(repository.createProduct(product)).rejects.not.toThrow(
        ProductAlreadyExistsError,
      );
    });

    it('rethrows a unique constraint violation with no target metadata unchanged', async () => {
      const untargetedError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '7.9.1',
        },
      );
      prisma.product.create.mockRejectedValue(untargetedError);

      await expect(repository.createProduct(product)).rejects.toThrow(
        untargetedError,
      );
      await expect(repository.createProduct(product)).rejects.not.toThrow(
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
          code: product.code,
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
      const result = await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
      });

      expect(result).toEqual({ items: [product], total: 1 });
    });

    it('builds a baseline where clause with only deletedAt and disabled when no other filters are provided', async () => {
      await repository.getAllProducts({ page: 1, limit: 20, disabled: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
        skip: 0,
        take: 20,
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
      });
    });

    it('skips zero records on the first page', async () => {
      await repository.getAllProducts({ page: 1, limit: 20, disabled: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
        skip: 0,
        take: 20,
      });
    });

    it('skips the correct number of records on a later page', async () => {
      await repository.getAllProducts({ page: 2, limit: 10, disabled: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
        skip: 10,
        take: 10,
      });
    });

    it('builds a case-insensitive partial match clause when name is provided', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        name: 'shirt',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            disabled: false,
            name: { contains: 'shirt', mode: 'insensitive' },
          },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          disabled: false,
          name: { contains: 'shirt', mode: 'insensitive' },
        },
      });
    });

    it('filters by categoryId when provided', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        categoryId: 'category-id',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            disabled: false,
            categoryId: 'category-id',
          },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          disabled: false,
          categoryId: 'category-id',
        },
      });
    });

    it('builds the where clause with disabled: true when filtering for disabled products', async () => {
      await repository.getAllProducts({ page: 1, limit: 20, disabled: true });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, disabled: true },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: true },
      });
    });

    it('builds the where clause with disabled: false when filtering for enabled products', async () => {
      await repository.getAllProducts({ page: 1, limit: 20, disabled: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, disabled: false },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
      });
    });

    it('builds a some-liked variants clause when liked: true and userId are both provided', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        liked: true,
        userId: 'user-id',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            disabled: false,
            variants: {
              some: { likedProductVariants: { some: { userId: 'user-id' } } },
            },
          },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          disabled: false,
          variants: {
            some: { likedProductVariants: { some: { userId: 'user-id' } } },
          },
        },
      });
    });

    it('omits the variants clause entirely when liked is provided without userId', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        liked: true,
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, disabled: false },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
      });
    });

    it('omits the variants clause entirely when userId is provided without liked', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        userId: 'user-id',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, disabled: false },
        }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
      });
    });

    describe('when fields includes productVariants', () => {
      const variantRecord = {
        id: 'variant-id',
        sku: 'TS-000001-BLK',
        price: 19.99,
        stock: 10,
        disabled: false,
        attributes: { color: 'black' },
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-01T00:00:00.000Z'),
        deletedAt: null,
        productId: product.id,
      };

      const variant = ProductVariant.restore(variantRecord);

      beforeEach(() => {
        prisma.product.findMany.mockResolvedValue([
          {
            id: product.id,
            name: product.name,
            code: product.code,
            description: product.description,
            disabled: product.disabled,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            deletedAt: null,
            categoryId: product.categoryId,
            variants: [variantRecord],
          },
        ]);
      });

      it('includes the live variants and maps them onto the domain product when no liked filter is set', async () => {
        const result = await repository.getAllProducts({
          page: 1,
          limit: 20,
          disabled: false,
          fields: ['productVariants'],
        });

        expect(prisma.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: { variants: { where: { deletedAt: null } } },
          }),
        );
        expect(result.items[0].productVariants).toEqual([variant]);
      });

      it('scopes the embedded variants to those liked by the user when liked and userId are both set', async () => {
        await repository.getAllProducts({
          page: 1,
          limit: 20,
          disabled: false,
          liked: true,
          userId: 'user-id',
          fields: ['productVariants'],
        });

        expect(prisma.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: {
              variants: {
                where: {
                  deletedAt: null,
                  likedProductVariants: { some: { userId: 'user-id' } },
                },
              },
            },
          }),
        );
      });

      it('embeds all live variants, not just disabled ones, when listing disabled products', async () => {
        await repository.getAllProducts({
          page: 1,
          limit: 20,
          disabled: true,
          fields: ['productVariants'],
        });

        expect(prisma.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: { variants: { where: { deletedAt: null } } },
          }),
        );
      });
    });

    it('calls findMany without an include key when fields is omitted', async () => {
      await repository.getAllProducts({ page: 1, limit: 20, disabled: false });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
        skip: 0,
        take: 20,
      });
    });

    it('calls findMany without an include key when fields is empty', async () => {
      await repository.getAllProducts({
        page: 1,
        limit: 20,
        disabled: false,
        fields: [],
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, disabled: false },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('updateProduct', () => {
    it('updates the product and returns the mapped domain entity', async () => {
      prisma.product.update.mockResolvedValue({
        id: product.id,
        name: product.name,
        code: product.code,
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
      const updatedRecord = {
        id: deletedProduct.id,
        name: deletedProduct.name,
        code: deletedProduct.code,
        description: deletedProduct.description,
        disabled: deletedProduct.disabled,
        createdAt: deletedProduct.createdAt,
        updatedAt: deletedProduct.updatedAt,
        deletedAt: deletedProduct.deletedAt,
        categoryId: deletedProduct.categoryId,
      };
      prisma.product.update.mockResolvedValue(updatedRecord);
      prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockResolvedValue([updatedRecord, { count: 1 }]);

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

    it('cascades the soft-delete to only the live variants of the product using the same timestamps', async () => {
      const deletedProduct = Product.delete(product);
      prisma.product.update.mockResolvedValue({
        id: deletedProduct.id,
        name: deletedProduct.name,
        code: deletedProduct.code,
        description: deletedProduct.description,
        disabled: deletedProduct.disabled,
        createdAt: deletedProduct.createdAt,
        updatedAt: deletedProduct.updatedAt,
        deletedAt: deletedProduct.deletedAt,
        categoryId: deletedProduct.categoryId,
      });
      prisma.productVariant.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockResolvedValue([{}, { count: 1 }]);

      await repository.deleteProduct(deletedProduct);

      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { productId: deletedProduct.id, deletedAt: null },
        data: {
          updatedAt: deletedProduct.updatedAt,
          deletedAt: deletedProduct.deletedAt,
        },
      });
    });

    it('translates a record-not-found error into ProductNotFoundError', async () => {
      prisma.$transaction.mockRejectedValue(
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
      prisma.$transaction.mockRejectedValue(new Error('connection lost'));

      await expect(repository.deleteProduct(product)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('setDisabled', () => {
    it('persists the disabled flag and returns the mapped domain entity', async () => {
      const disabledProduct = Product.setDisabled(product, true);
      prisma.product.update.mockResolvedValue({
        id: disabledProduct.id,
        name: disabledProduct.name,
        code: disabledProduct.code,
        description: disabledProduct.description,
        disabled: disabledProduct.disabled,
        createdAt: disabledProduct.createdAt,
        updatedAt: disabledProduct.updatedAt,
        deletedAt: disabledProduct.deletedAt,
        categoryId: disabledProduct.categoryId,
      });

      const result = await repository.setDisabled(disabledProduct);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: disabledProduct.id },
        data: {
          disabled: disabledProduct.disabled,
          updatedAt: disabledProduct.updatedAt,
        },
      });
      expect(result).toEqual(disabledProduct);
    });
  });

  describe('getProductById', () => {
    it('returns the mapped domain entity when the product exists', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: product.id,
        name: product.name,
        code: product.code,
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

    it('maps a null categoryId through unchanged when the product has no category', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: null,
        categoryId: null,
      });

      const result = await repository.getProductById('product-id');

      expect(result?.categoryId).toBeNull();
    });
  });

  describe('getLastProductCode', () => {
    it('returns the code of the most recently generated product', async () => {
      prisma.product.findFirst.mockResolvedValue({ code: 'TS-000041' });

      const result = await repository.getLastProductCode();

      expect(result).toBe('TS-000041');
    });

    it('returns null when no product exists yet', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      const result = await repository.getLastProductCode();

      expect(result).toBeNull();
    });

    it('does not filter out soft-deleted products, so codes are never reissued', async () => {
      prisma.product.findFirst.mockResolvedValue({ code: 'TS-000041' });

      await repository.getLastProductCode();

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        orderBy: { code: 'desc' },
        select: { code: true },
      });
    });
  });
});
