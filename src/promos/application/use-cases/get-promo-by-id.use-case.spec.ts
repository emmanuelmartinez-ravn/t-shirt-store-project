import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { GetPromoByIdUseCase } from './get-promo-by-id.use-case';

describe('GetPromoByIdUseCase', () => {
  let useCase: GetPromoByIdUseCase;
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

    useCase = new GetPromoByIdUseCase(promoRepository);
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
    promoRepository.getPromoById.mockResolvedValue(promo);

    const result = await useCase.execute('promo-id');

    expect(promoRepository.getPromoById).toHaveBeenCalledWith('promo-id');
    expect(result).toBe(promo);
  });

  it('returns a soft-deleted promo instead of treating it as missing', async () => {
    const deletedPromo = Promo.restore({
      id: 'promo-id',
      code: 'SUMMER2026',
      type: 'percentage',
      value: 15,
      expiration: null,
      remainUsages: null,
      minimumPurchaseAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    });
    promoRepository.getPromoById.mockResolvedValue(deletedPromo);

    const result = await useCase.execute('promo-id');

    expect(result).toBe(deletedPromo);
  });

  it('translates a missing promo into a NotFoundException', async () => {
    promoRepository.getPromoById.mockResolvedValue(null);

    await expect(useCase.execute('promo-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.getPromoById.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('promo-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
