import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { UpdatePromoUseCase } from './update-promo.use-case';

describe('UpdatePromoUseCase', () => {
  let useCase: UpdatePromoUseCase;
  let promoRepository: jest.Mocked<PromoRepository>;

  const existingPromo = Promo.restore({
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

  const updateProps = {
    code: 'WINTER2026',
    type: 'fixed' as const,
    value: 20,
    expiration: null,
    remainUsages: 50,
    minimumPurchaseAmount: 100,
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

    useCase = new UpdatePromoUseCase(promoRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('updates and returns the promo', async () => {
    const persistedPromo = Promo.restore({
      id: 'promo-id',
      code: 'WINTER2026',
      type: 'fixed',
      value: 20,
      expiration: null,
      remainUsages: 50,
      minimumPurchaseAmount: 100,
      createdAt: existingPromo.createdAt,
      updatedAt: new Date(),
      deletedAt: null,
    });
    promoRepository.getPromoById.mockResolvedValue(existingPromo);
    promoRepository.updatePromo.mockResolvedValue(persistedPromo);

    const result = await useCase.execute('promo-id', updateProps);

    expect(promoRepository.updatePromo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'promo-id',
        code: 'WINTER2026',
        type: 'fixed',
      }),
    );
    expect(result).toBe(persistedPromo);
  });

  it('translates a missing promo into a NotFoundException', async () => {
    promoRepository.getPromoById.mockResolvedValue(null);

    await expect(useCase.execute('promo-id', updateProps)).rejects.toThrow(
      NotFoundException,
    );
    expect(promoRepository.updatePromo).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.getPromoById.mockResolvedValue(existingPromo);
    promoRepository.updatePromo.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('promo-id', updateProps)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
