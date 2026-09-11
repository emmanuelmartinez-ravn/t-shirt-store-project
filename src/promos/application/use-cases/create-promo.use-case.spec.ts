import { InternalServerErrorException } from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { CreatePromoUseCase } from './create-promo.use-case';

describe('CreatePromoUseCase', () => {
  let useCase: CreatePromoUseCase;
  let promoRepository: jest.Mocked<PromoRepository>;

  const createProps = {
    code: 'SUMMER2026',
    type: 'percentage' as const,
    value: 15,
    expiration: null,
    remainUsages: null,
    minimumPurchaseAmount: null,
  };

  beforeEach(() => {
    promoRepository = {
      createPromo: jest.fn(),
      getAllPromos: jest.fn(),
      getPromoById: jest.fn(),
      getPromoByCode: jest.fn(),
      updatePromo: jest.fn(),
      deletePromo: jest.fn(),
    };

    useCase = new CreatePromoUseCase(promoRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates and returns the promo', async () => {
    const persistedPromo = Promo.restore({
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
    promoRepository.createPromo.mockResolvedValue(persistedPromo);

    const result = await useCase.execute(createProps);

    expect(promoRepository.createPromo).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SUMMER2026', type: 'percentage' }),
    );
    expect(result).toBe(persistedPromo);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.createPromo.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute(createProps)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
