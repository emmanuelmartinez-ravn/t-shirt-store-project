import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductVariantAlreadyExistsError } from '../../domain/errors/product-variant-already-exists';
import { ProductVariant } from '../../domain/models/product-variant';
import { PrismaProductVariantRepository } from './prisma-product-variant.repository';

describe('PrismaProductVariantRepository', () => {
  let repository: PrismaProductVariantRepository;
  let prisma: {
    productVariant: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const variant = ProductVariant.restore({
    id: 'variant-id',
    sku: 'TS-000001-MED-BLU',
    price: 19.99,
    stock: 100,
    disabled: false,
    attributes: { size: 'medium', color: 'blue' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    productId: 'product-id',
  });

  beforeEach(() => {
    prisma = {
      productVariant: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    repository = new PrismaProductVariantRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createProductVariant', () => {
    it('persists the product variant and returns the mapped domain entity', async () => {
      prisma.productVariant.create.mockResolvedValue({
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        disabled: variant.disabled,
        attributes: variant.attributes,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        deletedAt: null,
        productId: variant.productId,
      });

      const result = await repository.createProductVariant(variant);

      expect(prisma.productVariant.create).toHaveBeenCalledWith({
        data: {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stock: variant.stock,
          disabled: variant.disabled,
          attributes: variant.attributes,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
          productId: variant.productId,
        },
      });
      expect(result).toEqual(variant);
    });

    it('translates a unique constraint violation into ProductVariantAlreadyExistsError', async () => {
      prisma.productVariant.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['sku'] },
        }),
      );

      await expect(repository.createProductVariant(variant)).rejects.toThrow(
        ProductVariantAlreadyExistsError,
      );
    });

    it('translates a unique constraint violation with no target metadata into ProductVariantAlreadyExistsError', async () => {
      prisma.productVariant.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.createProductVariant(variant)).rejects.toThrow(
        ProductVariantAlreadyExistsError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.productVariant.create.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(repository.createProductVariant(variant)).rejects.toThrow(
        'connection lost',
      );
    });

    it('rethrows a different prisma error code unchanged', async () => {
      const notFoundError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '7.9.1',
        },
      );
      prisma.productVariant.create.mockRejectedValue(notFoundError);

      await expect(repository.createProductVariant(variant)).rejects.toThrow(
        notFoundError,
      );
      await expect(
        repository.createProductVariant(variant),
      ).rejects.not.toThrow(ProductVariantAlreadyExistsError);
    });
  });

  describe('getProductVariantById', () => {
    it('returns the mapped domain entity when a record is found', async () => {
      prisma.productVariant.findUnique.mockResolvedValue({
        id: variant.id,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        disabled: variant.disabled,
        attributes: variant.attributes,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        deletedAt: null,
        productId: variant.productId,
      });

      const result = await repository.getProductVariantById(variant.id);

      expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: variant.id },
      });
      expect(result).toEqual(variant);
    });

    it('returns null when no record is found', async () => {
      prisma.productVariant.findUnique.mockResolvedValue(null);

      const result = await repository.getProductVariantById('missing-id');

      expect(prisma.productVariant.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing-id' },
      });
      expect(result).toBeNull();
    });
  });
});
