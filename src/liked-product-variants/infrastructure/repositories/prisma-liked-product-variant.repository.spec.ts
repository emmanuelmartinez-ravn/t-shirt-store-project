import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { AlreadyLikedError } from '../../domain/errors/already-liked';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { PrismaLikedProductVariantRepository } from './prisma-liked-product-variant.repository';

describe('PrismaLikedProductVariantRepository', () => {
  let repository: PrismaLikedProductVariantRepository;
  let prisma: {
    likedProductVariant: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const likedProductVariant = LikedProductVariant.restore({
    id: 'like-id',
    userId: 'user-id',
    productVariantId: 'variant-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    prisma = {
      likedProductVariant: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    repository = new PrismaLikedProductVariantRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('like', () => {
    it('persists the like and returns the mapped domain entity', async () => {
      prisma.likedProductVariant.create.mockResolvedValue({
        id: likedProductVariant.id,
        userId: likedProductVariant.userId,
        productVariantId: likedProductVariant.productVariantId,
        createdAt: likedProductVariant.createdAt,
        updatedAt: likedProductVariant.updatedAt,
        deletedAt: null,
      });

      const result = await repository.like(likedProductVariant);

      expect(prisma.likedProductVariant.create).toHaveBeenCalledWith({
        data: {
          id: likedProductVariant.id,
          userId: likedProductVariant.userId,
          productVariantId: likedProductVariant.productVariantId,
          createdAt: likedProductVariant.createdAt,
          updatedAt: likedProductVariant.updatedAt,
        },
      });
      expect(result).toEqual(likedProductVariant);
    });

    it('translates a unique constraint violation into AlreadyLikedError', async () => {
      prisma.likedProductVariant.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.9.1',
          meta: { target: ['userId', 'productVariantId'] },
        }),
      );

      await expect(repository.like(likedProductVariant)).rejects.toThrow(
        AlreadyLikedError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.likedProductVariant.create.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(repository.like(likedProductVariant)).rejects.toThrow(
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
      prisma.likedProductVariant.create.mockRejectedValue(notFoundError);

      await expect(repository.like(likedProductVariant)).rejects.toThrow(
        notFoundError,
      );
      await expect(repository.like(likedProductVariant)).rejects.not.toThrow(
        AlreadyLikedError,
      );
    });
  });

  describe('unlike', () => {
    it('returns true when a matching like is deleted', async () => {
      prisma.likedProductVariant.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.unlike('user-id', 'variant-id');

      expect(prisma.likedProductVariant.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', productVariantId: 'variant-id' },
      });
      expect(result).toBe(true);
    });

    it('returns false when no matching like is deleted', async () => {
      prisma.likedProductVariant.deleteMany.mockResolvedValue({ count: 0 });

      const result = await repository.unlike('user-id', 'variant-id');

      expect(prisma.likedProductVariant.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', productVariantId: 'variant-id' },
      });
      expect(result).toBe(false);
    });
  });
});
