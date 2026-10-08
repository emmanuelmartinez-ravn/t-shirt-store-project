import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { ProductImage } from '../../domain/models/product-image';
import { PrismaProductImageRepository } from './prisma-product-image.repository';

describe('PrismaProductImageRepository', () => {
  let repository: PrismaProductImageRepository;
  let prisma: {
    productImage: {
      count: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const record = {
    id: 'image-id',
    imagePath: 'products/product-id/image.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
    variantId: null,
  };
  const otherRecord = {
    ...record,
    id: 'other-image-id',
    imagePath: 'products/other-product-id/image.jpg',
    productId: 'other-product-id',
  };

  beforeEach(() => {
    prisma = {
      productImage: {
        count: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaProductImageRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('countActiveImages', () => {
    it('counts only the non-deleted images of the product', async () => {
      prisma.productImage.count.mockResolvedValue(4);

      const result = await repository.countActiveImages('product-id');

      expect(prisma.productImage.count).toHaveBeenCalledWith({
        where: { productId: 'product-id', deletedAt: null },
      });
      expect(result).toBe(4);
    });
  });

  describe('createImages', () => {
    it('persists every image in a single createMany call', async () => {
      prisma.productImage.createMany.mockResolvedValue({ count: 2 });
      const images = [
        ProductImage.restore(record),
        ProductImage.restore(otherRecord),
      ];

      await expect(repository.createImages(images)).resolves.toBeUndefined();

      expect(prisma.productImage.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.productImage.createMany).toHaveBeenCalledWith({
        data: [record, otherRecord],
      });
    });

    it('propagates persistence failures', async () => {
      prisma.productImage.createMany.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        repository.createImages([ProductImage.restore(record)]),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('getActiveImagesByProductIds', () => {
    it('fetches the live images of all given products oldest first and maps them to domain entities', async () => {
      prisma.productImage.findMany.mockResolvedValue([record, otherRecord]);

      const result = await repository.getActiveImagesByProductIds([
        'product-id',
        'other-product-id',
      ]);

      expect(prisma.productImage.findMany).toHaveBeenCalledWith({
        where: {
          productId: { in: ['product-id', 'other-product-id'] },
          deletedAt: null,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        ProductImage.restore(record),
        ProductImage.restore(otherRecord),
      ]);
      expect(result[0]).toBeInstanceOf(ProductImage);
    });

    it('returns an empty list without querying when no product ids are given', async () => {
      const result = await repository.getActiveImagesByProductIds([]);

      expect(prisma.productImage.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getActiveImageById', () => {
    it('looks up the non-deleted image by id and maps it to a domain entity', async () => {
      prisma.productImage.findFirst.mockResolvedValue(record);

      const result = await repository.getActiveImageById('image-id');

      expect(prisma.productImage.findFirst).toHaveBeenCalledWith({
        where: { id: 'image-id', deletedAt: null },
      });
      expect(result).toEqual(ProductImage.restore(record));
      expect(result).toBeInstanceOf(ProductImage);
    });

    it('returns null when no live image matches', async () => {
      prisma.productImage.findFirst.mockResolvedValue(null);

      const result = await repository.getActiveImageById('image-id');

      expect(result).toBeNull();
    });
  });

  describe('deleteImage', () => {
    const deletedAt = new Date('2026-02-01T00:00:00.000Z');
    const deletedRecord = { ...record, updatedAt: deletedAt, deletedAt };
    const deletedImage = ProductImage.restore(deletedRecord);

    it('soft-deletes only a still-live image by writing its updatedAt and deletedAt, and returns the mapped record', async () => {
      prisma.productImage.update.mockResolvedValue(deletedRecord);

      const result = await repository.deleteImage(deletedImage);

      expect(prisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'image-id', deletedAt: null },
        data: { updatedAt: deletedAt, deletedAt },
      });
      expect(result).toEqual(deletedImage);
      expect(result).toBeInstanceOf(ProductImage);
    });

    it('translates a record-not-found error into ProductImageNotFoundError', async () => {
      prisma.productImage.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.deleteImage(deletedImage)).rejects.toThrow(
        ProductImageNotFoundError,
      );
    });

    it('rethrows other known prisma errors unchanged', async () => {
      const failure = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '7.9.1' },
      );
      prisma.productImage.update.mockRejectedValue(failure);

      await expect(repository.deleteImage(deletedImage)).rejects.toBe(failure);
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.productImage.update.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(repository.deleteImage(deletedImage)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('updateImageVariant', () => {
    const updatedAt = new Date('2026-02-01T00:00:00.000Z');
    const linkedRecord = { ...record, updatedAt, variantId: 'variant-id' };
    const linkedImage = ProductImage.restore(linkedRecord);

    it('writes the variant id and updatedAt of a still-live image and returns the mapped record', async () => {
      prisma.productImage.update.mockResolvedValue(linkedRecord);

      const result = await repository.updateImageVariant(linkedImage);

      expect(prisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'image-id', deletedAt: null },
        data: { variantId: 'variant-id', updatedAt },
      });
      expect(result).toEqual(linkedImage);
      expect(result).toBeInstanceOf(ProductImage);
    });

    it('writes a null variant id when unlinking', async () => {
      const unlinkedRecord = { ...record, updatedAt, variantId: null };
      prisma.productImage.update.mockResolvedValue(unlinkedRecord);

      const result = await repository.updateImageVariant(
        ProductImage.restore(unlinkedRecord),
      );

      expect(prisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'image-id', deletedAt: null },
        data: { variantId: null, updatedAt },
      });
      expect(result.variantId).toBeNull();
    });

    it('translates a record-not-found error into ProductImageNotFoundError', async () => {
      prisma.productImage.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updateImageVariant(linkedImage)).rejects.toThrow(
        ProductImageNotFoundError,
      );
    });

    it('rethrows other known prisma errors unchanged', async () => {
      const failure = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '7.9.1' },
      );
      prisma.productImage.update.mockRejectedValue(failure);

      await expect(repository.updateImageVariant(linkedImage)).rejects.toBe(
        failure,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.productImage.update.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(repository.updateImageVariant(linkedImage)).rejects.toThrow(
        'connection lost',
      );
    });
  });
});
