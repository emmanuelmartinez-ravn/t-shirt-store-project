import { PrismaService } from '../../../prisma/services/prisma.service';
import { ProductImage } from '../../domain/models/product-image';
import { PrismaProductImageRepository } from './prisma-product-image.repository';

describe('PrismaProductImageRepository', () => {
  let repository: PrismaProductImageRepository;
  let prisma: {
    productImage: {
      count: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
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
});
