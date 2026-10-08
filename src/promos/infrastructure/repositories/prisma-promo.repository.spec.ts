import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { PromoNotFoundError } from '../../domain/errors/promo-not-found';
import { Promo } from '../../domain/models/promo';
import { PrismaPromoRepository } from './prisma-promo.repository';

describe('PrismaPromoRepository', () => {
  let repository: PrismaPromoRepository;
  let prisma: {
    promo: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

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
    prisma = {
      promo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaPromoRepository(prisma as unknown as PrismaService);
  });

  describe('createPromo', () => {
    it('persists the promo and returns the mapped domain entity', async () => {
      prisma.promo.create.mockResolvedValue({
        id: promo.id,
        code: promo.code,
        type: 'percentage',
        value: promo.value,
        expiration: promo.expiration,
        remainUsages: promo.remainUsages,
        minimumPurchaseAmount: promo.minimumPurchaseAmount,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
        deletedAt: null,
      });

      const result = await repository.createPromo(promo);

      expect(prisma.promo.create).toHaveBeenCalledWith({
        data: {
          id: promo.id,
          code: promo.code,
          type: 'percentage',
          value: promo.value,
          expiration: promo.expiration,
          remainUsages: promo.remainUsages,
          minimumPurchaseAmount: promo.minimumPurchaseAmount,
          createdAt: promo.createdAt,
          updatedAt: promo.updatedAt,
        },
      });
      expect(result).toEqual(promo);
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.promo.create.mockRejectedValue(new Error('connection lost'));

      await expect(repository.createPromo(promo)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('getAllPromos', () => {
    it('returns all live promos mapped to domain entities', async () => {
      prisma.promo.findMany.mockResolvedValue([
        {
          id: promo.id,
          code: promo.code,
          type: 'percentage',
          value: promo.value,
          expiration: promo.expiration,
          remainUsages: promo.remainUsages,
          minimumPurchaseAmount: promo.minimumPurchaseAmount,
          createdAt: promo.createdAt,
          updatedAt: promo.updatedAt,
          deletedAt: null,
        },
      ]);

      const result = await repository.getAllPromos();

      expect(prisma.promo.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(result).toEqual([promo]);
    });
  });

  describe('getPromoById', () => {
    it('returns the mapped domain entity when the promo exists', async () => {
      prisma.promo.findUnique.mockResolvedValue({
        id: promo.id,
        code: promo.code,
        type: 'percentage',
        value: promo.value,
        expiration: promo.expiration,
        remainUsages: promo.remainUsages,
        minimumPurchaseAmount: promo.minimumPurchaseAmount,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getPromoById('promo-id');

      expect(prisma.promo.findUnique).toHaveBeenCalledWith({
        where: { id: 'promo-id' },
      });
      expect(result).toEqual(promo);
    });

    it('returns null when no promo matches the id', async () => {
      prisma.promo.findUnique.mockResolvedValue(null);

      const result = await repository.getPromoById('missing');

      expect(result).toBeNull();
    });
  });

  describe('getPromoByCode', () => {
    it('returns the mapped domain entity when a live promo matches the code', async () => {
      prisma.promo.findFirst.mockResolvedValue({
        id: promo.id,
        code: promo.code,
        type: 'percentage',
        value: promo.value,
        expiration: promo.expiration,
        remainUsages: promo.remainUsages,
        minimumPurchaseAmount: promo.minimumPurchaseAmount,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getPromoByCode('SUMMER2026');

      expect(prisma.promo.findFirst).toHaveBeenCalledWith({
        where: { code: 'SUMMER2026', deletedAt: null },
      });
      expect(result).toEqual(promo);
    });

    it('returns null when no live promo matches the code', async () => {
      prisma.promo.findFirst.mockResolvedValue(null);

      const result = await repository.getPromoByCode('MISSING');

      expect(result).toBeNull();
    });
  });

  describe('updatePromo', () => {
    it('updates the promo and returns the mapped domain entity', async () => {
      prisma.promo.update.mockResolvedValue({
        id: promo.id,
        code: promo.code,
        type: 'percentage',
        value: promo.value,
        expiration: promo.expiration,
        remainUsages: promo.remainUsages,
        minimumPurchaseAmount: promo.minimumPurchaseAmount,
        createdAt: promo.createdAt,
        updatedAt: promo.updatedAt,
        deletedAt: null,
      });

      const result = await repository.updatePromo(promo);

      expect(prisma.promo.update).toHaveBeenCalledWith({
        where: { id: promo.id },
        data: {
          code: promo.code,
          type: 'percentage',
          value: promo.value,
          expiration: promo.expiration,
          remainUsages: promo.remainUsages,
          minimumPurchaseAmount: promo.minimumPurchaseAmount,
          updatedAt: promo.updatedAt,
        },
      });
      expect(result).toEqual(promo);
    });

    it('translates a record-not-found error into PromoNotFoundError', async () => {
      prisma.promo.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.updatePromo(promo)).rejects.toThrow(
        PromoNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.promo.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.updatePromo(promo)).rejects.toThrow(
        'connection lost',
      );
    });
  });

  describe('deletePromo', () => {
    it('soft-deletes the promo and returns the mapped domain entity', async () => {
      const deletedPromo = Promo.delete(promo);
      prisma.promo.update.mockResolvedValue({
        id: deletedPromo.id,
        code: deletedPromo.code,
        type: 'percentage',
        value: deletedPromo.value,
        expiration: deletedPromo.expiration,
        remainUsages: deletedPromo.remainUsages,
        minimumPurchaseAmount: deletedPromo.minimumPurchaseAmount,
        createdAt: deletedPromo.createdAt,
        updatedAt: deletedPromo.updatedAt,
        deletedAt: deletedPromo.deletedAt,
      });

      const result = await repository.deletePromo(deletedPromo);

      expect(prisma.promo.update).toHaveBeenCalledWith({
        where: { id: deletedPromo.id },
        data: {
          updatedAt: deletedPromo.updatedAt,
          deletedAt: deletedPromo.deletedAt,
        },
      });
      expect(result).toEqual(deletedPromo);
    });

    it('translates a record-not-found error into PromoNotFoundError', async () => {
      prisma.promo.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '7.9.1',
        }),
      );

      await expect(repository.deletePromo(promo)).rejects.toThrow(
        PromoNotFoundError,
      );
    });

    it('rethrows unrelated errors unchanged', async () => {
      prisma.promo.update.mockRejectedValue(new Error('connection lost'));

      await expect(repository.deletePromo(promo)).rejects.toThrow(
        'connection lost',
      );
    });
  });
});
