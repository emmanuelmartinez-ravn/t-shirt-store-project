import { PrismaService } from '../../../prisma/services/prisma.service';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { PrismaAccountActivationTokenRepository } from './prisma-account-activation-token.repository';

describe('PrismaAccountActivationTokenRepository', () => {
  let repository: PrismaAccountActivationTokenRepository;
  let prisma: {
    accountActivationToken: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const token = AccountActivationToken.restore({
    id: 'token-id',
    jti: 'jti-value',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userId: 'user-id',
  });

  beforeEach(() => {
    prisma = {
      accountActivationToken: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaAccountActivationTokenRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('createToken', () => {
    it('persists the token and returns the mapped domain entity', async () => {
      prisma.accountActivationToken.create.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.createToken(token);

      expect(prisma.accountActivationToken.create).toHaveBeenCalledWith({
        data: {
          id: token.id,
          jti: token.jti,
          expiresAt: token.expiresAt,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
          userId: token.userId,
        },
      });
      expect(result).toEqual(token);
    });
  });

  describe('deleteExpiredTokens', () => {
    it('soft-deletes tokens past their expiry and returns the count', async () => {
      const now = new Date();
      prisma.accountActivationToken.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await repository.deleteExpiredTokens(now);

      expect(prisma.accountActivationToken.updateMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: now }, deletedAt: null },
        data: { deletedAt: now },
      });
      expect(result).toBe(2);
    });
  });

  describe('getTokenByJti', () => {
    it('returns the mapped domain entity when a live token matches', async () => {
      prisma.accountActivationToken.findFirst.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.getTokenByJti('jti-value');

      expect(prisma.accountActivationToken.findFirst).toHaveBeenCalledWith({
        where: { jti: 'jti-value', deletedAt: null },
      });
      expect(result).toEqual(token);
    });

    it('returns null when no live token matches', async () => {
      prisma.accountActivationToken.findFirst.mockResolvedValue(null);

      const result = await repository.getTokenByJti('missing');

      expect(result).toBeNull();
    });
  });

  describe('consumeToken', () => {
    it('soft-deletes the token and returns the mapped domain entity', async () => {
      const consumed = AccountActivationToken.consume(token);
      prisma.accountActivationToken.update.mockResolvedValue({
        id: consumed.id,
        jti: consumed.jti,
        expiresAt: consumed.expiresAt,
        createdAt: consumed.createdAt,
        updatedAt: consumed.updatedAt,
        deletedAt: consumed.deletedAt,
        userId: consumed.userId,
      });

      const result = await repository.consumeToken(consumed);

      expect(prisma.accountActivationToken.update).toHaveBeenCalledWith({
        where: { id: consumed.id },
        data: {
          updatedAt: consumed.updatedAt,
          deletedAt: consumed.deletedAt,
        },
      });
      expect(result).toEqual(consumed);
    });
  });

  describe('getValidTokenByUserId', () => {
    it('returns the mapped domain entity when a valid token exists', async () => {
      const now = new Date();
      prisma.accountActivationToken.findFirst.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.getValidTokenByUserId('user-id', now);

      expect(prisma.accountActivationToken.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
          deletedAt: null,
          expiresAt: { gt: now },
        },
      });
      expect(result).toEqual(token);
    });

    it('returns null when no valid token exists', async () => {
      prisma.accountActivationToken.findFirst.mockResolvedValue(null);

      const result = await repository.getValidTokenByUserId(
        'user-id',
        new Date(),
      );

      expect(result).toBeNull();
    });
  });
});
