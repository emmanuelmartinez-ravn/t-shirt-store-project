import { InternalServerErrorException } from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { GetAllPromosUseCase } from './get-all-promos.use-case';

describe('GetAllPromosUseCase', () => {
  let useCase: GetAllPromosUseCase;
  let promoRepository: jest.Mocked<PromoRepository>;

  beforeEach(() => {
    promoRepository = {
      createPromo: jest.fn(),
      getAllPromos: jest.fn(),
      getPromoById: jest.fn(),
      getPromoByCode: jest.fn(),
      updatePromo: jest.fn(),
      deletePromo: jest.fn(),
    };

    useCase = new GetAllPromosUseCase(promoRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns all promos', async () => {
    const promos = [
      Promo.restore({
        id: 'promo-id',
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: null,
        remainUsages: null,
        minimumPurchaseAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    ];
    promoRepository.getAllPromos.mockResolvedValue(promos);

    const result = await useCase.execute();

    expect(result).toBe(promos);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.getAllPromos.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
