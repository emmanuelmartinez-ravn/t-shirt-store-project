import { Request } from 'express';
import { LikeProductVariantUseCase } from '../../application/use-cases/like-product-variant.use-case';
import { UnlikeProductVariantUseCase } from '../../application/use-cases/unlike-product-variant.use-case';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { LikedProductVariantResponseMapper } from '../mappers/liked-product-variant-response.mapper';
import { LikedProductVariantsController } from './liked-product-variants.controller';

describe('LikedProductVariantsController', () => {
  let controller: LikedProductVariantsController;
  let likeProductVariantUseCase: jest.Mocked<LikeProductVariantUseCase>;
  let unlikeProductVariantUseCase: jest.Mocked<UnlikeProductVariantUseCase>;

  const likedProductVariant = LikedProductVariant.restore({
    id: 'like-id',
    userId: 'user-id',
    productVariantId: 'variant-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const req = {
    user: {
      sub: 'user-id',
      email: 'joe.doe@example.com',
      role: 'client',
      roleId: 'role-id',
    },
  } as unknown as Request;

  beforeEach(() => {
    likeProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LikeProductVariantUseCase>;
    unlikeProductVariantUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnlikeProductVariantUseCase>;

    controller = new LikedProductVariantsController(
      likeProductVariantUseCase,
      unlikeProductVariantUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('like', () => {
    it('delegates to the use case with the authenticated user id and returns the mapped response', async () => {
      likeProductVariantUseCase.execute.mockResolvedValue(likedProductVariant);

      const result = await controller.like(req, {
        productVariantId: 'variant-id',
      });

      expect(likeProductVariantUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });
      expect(result).toEqual(
        LikedProductVariantResponseMapper.toResponse(likedProductVariant),
      );
    });
  });

  describe('unlike', () => {
    it('delegates to the use case with the authenticated user id and path param, returning nothing', async () => {
      unlikeProductVariantUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.unlike(req, 'variant-id');

      expect(unlikeProductVariantUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });
      expect(result).toBeUndefined();
    });
  });
});
