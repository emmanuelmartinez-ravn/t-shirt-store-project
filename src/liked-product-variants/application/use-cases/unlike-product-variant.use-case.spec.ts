import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LikedProductVariantRepository } from '../../infrastructure/repositories/liked-product-variant.repository';
import { UnlikeProductVariantUseCase } from './unlike-product-variant.use-case';

describe('UnlikeProductVariantUseCase', () => {
  let useCase: UnlikeProductVariantUseCase;
  let likedProductVariantRepository: jest.Mocked<LikedProductVariantRepository>;

  beforeEach(() => {
    likedProductVariantRepository = {
      like: jest.fn(),
      unlike: jest.fn(),
    };

    useCase = new UnlikeProductVariantUseCase(likedProductVariantRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('unlikes the product variant', async () => {
      likedProductVariantRepository.unlike.mockResolvedValue(true);

      await useCase.execute({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });

      expect(likedProductVariantRepository.unlike).toHaveBeenCalledWith(
        'user-id',
        'variant-id',
      );
    });

    it('translates a missing like into a NotFoundException', async () => {
      likedProductVariantRepository.unlike.mockResolvedValue(false);

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
        }),
      ).rejects.toThrow(
        new NotFoundException({ error: 'Like not found', details: [] }),
      );
    });

    it('translates an unexpected failure into an InternalServerErrorException', async () => {
      likedProductVariantRepository.unlike.mockRejectedValue(
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
