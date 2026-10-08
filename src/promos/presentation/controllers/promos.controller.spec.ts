import { Promo } from '../../domain/models/promo';
import { CreatePromoUseCase } from '../../application/use-cases/create-promo.use-case';
import { DeletePromoUseCase } from '../../application/use-cases/delete-promo.use-case';
import { GetAllPromosUseCase } from '../../application/use-cases/get-all-promos.use-case';
import { GetPromoByCodeUseCase } from '../../application/use-cases/get-promo-by-code.use-case';
import { GetPromoByIdUseCase } from '../../application/use-cases/get-promo-by-id.use-case';
import { UpdatePromoUseCase } from '../../application/use-cases/update-promo.use-case';
import { PromosResponseMapper } from '../mappers/promos-response.mapper';
import { PromosController } from './promos.controller';

describe('PromosController', () => {
  let controller: PromosController;
  let createPromoUseCase: jest.Mocked<CreatePromoUseCase>;
  let getAllPromosUseCase: jest.Mocked<GetAllPromosUseCase>;
  let getPromoByIdUseCase: jest.Mocked<GetPromoByIdUseCase>;
  let getPromoByCodeUseCase: jest.Mocked<GetPromoByCodeUseCase>;
  let updatePromoUseCase: jest.Mocked<UpdatePromoUseCase>;
  let deletePromoUseCase: jest.Mocked<DeletePromoUseCase>;

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

  beforeEach(() => {
    createPromoUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreatePromoUseCase>;
    getAllPromosUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllPromosUseCase>;
    getPromoByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPromoByIdUseCase>;
    getPromoByCodeUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPromoByCodeUseCase>;
    updatePromoUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdatePromoUseCase>;
    deletePromoUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeletePromoUseCase>;

    controller = new PromosController(
      createPromoUseCase,
      getAllPromosUseCase,
      getPromoByIdUseCase,
      getPromoByCodeUseCase,
      updatePromoUseCase,
      deletePromoUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPromo', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      createPromoUseCase.execute.mockResolvedValue(promo);

      const result = await controller.createPromo({
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
      });

      expect(createPromoUseCase.execute).toHaveBeenCalledWith({
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: null,
        remainUsages: null,
        minimumPurchaseAmount: null,
      });
      expect(result).toEqual(PromosResponseMapper.toResponse(promo));
    });

    it('converts an expiration string into a Date before calling the use case', async () => {
      createPromoUseCase.execute.mockResolvedValue(promo);

      await controller.createPromo({
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: '2026-12-31T23:59:59.000Z',
        remainUsages: 100,
        minimumPurchaseAmount: 50,
      });

      expect(createPromoUseCase.execute).toHaveBeenCalledWith({
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: new Date('2026-12-31T23:59:59.000Z'),
        remainUsages: 100,
        minimumPurchaseAmount: 50,
      });
    });
  });

  describe('getAllPromos', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      getAllPromosUseCase.execute.mockResolvedValue([promo]);

      const result = await controller.getAllPromos();

      expect(getAllPromosUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual([PromosResponseMapper.toResponse(promo)]);
    });
  });

  describe('getPromoByCode', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      getPromoByCodeUseCase.execute.mockResolvedValue(promo);

      const result = await controller.getPromoByCode('SUMMER2026');

      expect(getPromoByCodeUseCase.execute).toHaveBeenCalledWith('SUMMER2026');
      expect(result).toEqual(PromosResponseMapper.toResponse(promo));
    });
  });

  describe('getPromoById', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      getPromoByIdUseCase.execute.mockResolvedValue(promo);

      const result = await controller.getPromoById('promo-id');

      expect(getPromoByIdUseCase.execute).toHaveBeenCalledWith('promo-id');
      expect(result).toEqual(PromosResponseMapper.toResponse(promo));
    });
  });

  describe('updatePromo', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const updatedPromo = Promo.restore({
        id: 'promo-id',
        code: 'WINTER2026',
        type: 'fixed',
        value: 20,
        expiration: null,
        remainUsages: 50,
        minimumPurchaseAmount: 100,
        createdAt: promo.createdAt,
        updatedAt: new Date(),
        deletedAt: null,
      });
      updatePromoUseCase.execute.mockResolvedValue(updatedPromo);

      const result = await controller.updatePromo('promo-id', {
        code: 'WINTER2026',
        type: 'fixed',
        value: 20,
        remainUsages: 50,
        minimumPurchaseAmount: 100,
      });

      expect(updatePromoUseCase.execute).toHaveBeenCalledWith('promo-id', {
        code: 'WINTER2026',
        type: 'fixed',
        value: 20,
        expiration: null,
        remainUsages: 50,
        minimumPurchaseAmount: 100,
      });
      expect(result).toEqual(PromosResponseMapper.toResponse(updatedPromo));
    });

    it('converts an expiration string into a Date before calling the use case', async () => {
      updatePromoUseCase.execute.mockResolvedValue(promo);

      await controller.updatePromo('promo-id', {
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: '2026-12-31T23:59:59.000Z',
      });

      expect(updatePromoUseCase.execute).toHaveBeenCalledWith('promo-id', {
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: new Date('2026-12-31T23:59:59.000Z'),
        remainUsages: null,
        minimumPurchaseAmount: null,
      });
    });
  });

  describe('deletePromo', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      const deletedPromo = Promo.restore({
        id: 'promo-id',
        code: 'SUMMER2026',
        type: 'percentage',
        value: 15,
        expiration: null,
        remainUsages: null,
        minimumPurchaseAmount: null,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
        deletedAt: new Date(),
      });
      deletePromoUseCase.execute.mockResolvedValue(deletedPromo);

      const result = await controller.deletePromo('promo-id');

      expect(deletePromoUseCase.execute).toHaveBeenCalledWith('promo-id');
      expect(result).toEqual(PromosResponseMapper.toResponse(deletedPromo));
    });
  });
});
