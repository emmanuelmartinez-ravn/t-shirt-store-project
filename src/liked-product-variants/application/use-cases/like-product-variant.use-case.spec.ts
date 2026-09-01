import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { AlreadyLikedError } from '../../domain/errors/already-liked';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { LikedProductVariantRepository } from '../../infrastructure/repositories/liked-product-variant.repository';
import { LikeProductVariantUseCase } from './like-product-variant.use-case';

describe('LikeProductVariantUseCase', () => {
  let useCase: LikeProductVariantUseCase;
  let likedProductVariantRepository: jest.Mocked<LikedProductVariantRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;

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

  const likedProductVariant = LikedProductVariant.restore({
    id: 'like-id',
    userId: 'user-id',
    productVariantId: 'variant-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    likedProductVariantRepository = {
      like: jest.fn(),
      unlike: jest.fn(),
    };
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getProductVariantById: jest.fn(),
    };

    useCase = new LikeProductVariantUseCase(
      likedProductVariantRepository,
      productVariantRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('likes the product variant and returns the persisted like', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      likedProductVariantRepository.like.mockResolvedValue(likedProductVariant);

      const result = await useCase.execute({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });

      expect(likedProductVariantRepository.like).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      );
      expect(result).toBe(likedProductVariant);
    });

    it('translates a missing product variant into a NotFoundException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(likedProductVariantRepository.like).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product variant into a NotFoundException', async () => {
      const deletedVariant = ProductVariant.restore({
        ...variant,
        deletedAt: new Date(),
      });
      productVariantRepository.getProductVariantById.mockResolvedValue(
        deletedVariant,
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(likedProductVariantRepository.like).not.toHaveBeenCalled();
    });

    it('translates AlreadyLikedError into a ConflictException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      likedProductVariantRepository.like.mockRejectedValue(
        new AlreadyLikedError('user-id', 'variant-id'),
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new ConflictException({
          error: 'Product variant already liked',
          details: [],
        }),
      );
    });

    it('translates an unexpected getProductVariantById failure into an InternalServerErrorException', async () => {
      productVariantRepository.getProductVariantById.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
      expect(likedProductVariantRepository.like).not.toHaveBeenCalled();
    });

    it('translates an unexpected like failure into an InternalServerErrorException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      likedProductVariantRepository.like.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
    });
  });
});
