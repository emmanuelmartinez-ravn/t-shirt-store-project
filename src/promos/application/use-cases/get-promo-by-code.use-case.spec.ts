import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { GetPromoByCodeUseCase } from './get-promo-by-code.use-case';

describe('GetPromoByCodeUseCase', () => {
  let useCase: GetPromoByCodeUseCase;
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

    useCase = new GetPromoByCodeUseCase(promoRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the promo when it exists', async () => {
    const promo = Promo.restore({
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
    });
    promoRepository.getPromoByCode.mockResolvedValue(promo);

    const result = await useCase.execute('SUMMER2026');

    expect(promoRepository.getPromoByCode).toHaveBeenCalledWith('SUMMER2026');
    expect(result).toBe(promo);
  });

  it('translates a missing promo into a NotFoundException', async () => {
    promoRepository.getPromoByCode.mockResolvedValue(null);

    await expect(useCase.execute('MISSING')).rejects.toThrow(NotFoundException);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.getPromoByCode.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('SUMMER2026')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
