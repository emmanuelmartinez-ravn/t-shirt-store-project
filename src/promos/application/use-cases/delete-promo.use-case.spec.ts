import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Promo } from '../../domain/models/promo';
import { PromoRepository } from '../../infrastructure/repositories/promo.repository';
import { DeletePromoUseCase } from './delete-promo.use-case';

describe('DeletePromoUseCase', () => {
  let useCase: DeletePromoUseCase;
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

  beforeEach(() => {
    promoRepository = {
      createPromo: jest.fn(),
      getAllPromos: jest.fn(),
      getPromoById: jest.fn(),
      getPromoByCode: jest.fn(),
      updatePromo: jest.fn(),
      deletePromo: jest.fn(),
    };

    useCase = new DeletePromoUseCase(promoRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes and returns the promo', async () => {
    const persistedPromo = Promo.restore({
      id: 'promo-id',
      code: 'SUMMER2026',
      type: 'percentage',
      value: 15,
      expiration: null,
      remainUsages: null,
      minimumPurchaseAmount: null,
      createdAt: existingPromo.createdAt,
      updatedAt: existingPromo.updatedAt,
      deletedAt: new Date(),
    });
    promoRepository.getPromoById.mockResolvedValue(existingPromo);
    promoRepository.deletePromo.mockResolvedValue(persistedPromo);

    const result = await useCase.execute('promo-id');

    const [deletedPromo] = promoRepository.deletePromo.mock.calls[0];
    expect(deletedPromo.id).toBe('promo-id');
    expect(deletedPromo.deletedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedPromo);
  });

  it('translates a missing promo into a NotFoundException', async () => {
    promoRepository.getPromoById.mockResolvedValue(null);

    await expect(useCase.execute('promo-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(promoRepository.deletePromo).not.toHaveBeenCalled();
  });

  it('translates an already-deleted promo into a GoneException', async () => {
    const alreadyDeletedPromo = Promo.restore({
      id: 'promo-id',
      code: 'SUMMER2026',
      type: 'percentage',
      value: 15,
      expiration: null,
      remainUsages: null,
      minimumPurchaseAmount: null,
      createdAt: existingPromo.createdAt,
      updatedAt: existingPromo.updatedAt,
      deletedAt: new Date(),
    });
    promoRepository.getPromoById.mockResolvedValue(alreadyDeletedPromo);

    await expect(useCase.execute('promo-id')).rejects.toThrow(GoneException);
    expect(promoRepository.deletePromo).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    promoRepository.getPromoById.mockResolvedValue(existingPromo);
    promoRepository.deletePromo.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute('promo-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
