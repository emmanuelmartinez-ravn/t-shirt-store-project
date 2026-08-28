import { PrismaService } from '../../../prisma/services/prisma.service';
import { RefreshToken } from '../../domain/models/refresh-token';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository';

describe('PrismaRefreshTokenRepository', () => {
  let repository: PrismaRefreshTokenRepository;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const token = RefreshToken.restore({
    id: 'token-id',
    jti: 'jti-value',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userId: 'user-id',
  });

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaRefreshTokenRepository(
      prisma as unknown as PrismaService,
    );
  });

  describe('createToken', () => {
    it('persists the token and returns the mapped domain entity', async () => {
      prisma.refreshToken.create.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        revokedAt: null,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.createToken(token);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          id: token.id,
          jti: token.jti,
          expiresAt: token.expiresAt,
          revokedAt: token.revokedAt,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
          userId: token.userId,
        },
      });
      expect(result).toEqual(token);
    });
  });

  describe('getTokenByJti', () => {
    it('returns the mapped domain entity when a live token matches', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        revokedAt: null,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.getTokenByJti('jti-value');

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { jti: 'jti-value', deletedAt: null },
      });
      expect(result).toEqual(token);
    });

    it('returns null when no live token matches', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      const result = await repository.getTokenByJti('missing');

      expect(result).toBeNull();
    });
  });

  describe('revokeToken', () => {
    it('revokes the token and returns the mapped domain entity', async () => {
      const revoked = RefreshToken.revoke(token);
      prisma.refreshToken.update.mockResolvedValue({
        id: revoked.id,
        jti: revoked.jti,
        expiresAt: revoked.expiresAt,
        revokedAt: revoked.revokedAt,
        createdAt: revoked.createdAt,
        updatedAt: revoked.updatedAt,
        deletedAt: null,
        userId: revoked.userId,
      });

      const result = await repository.revokeToken(revoked);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: revoked.id },
        data: {
          revokedAt: revoked.revokedAt,
          updatedAt: revoked.updatedAt,
        },
      });
      expect(result).toEqual(revoked);
    });
  });
});
