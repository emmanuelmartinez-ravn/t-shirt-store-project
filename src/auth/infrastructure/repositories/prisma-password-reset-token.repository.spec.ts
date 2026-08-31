import { PrismaService } from '../../../prisma/services/prisma.service';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { PrismaPasswordResetTokenRepository } from './prisma-password-reset-token.repository';

describe('PrismaPasswordResetTokenRepository', () => {
  let repository: PrismaPasswordResetTokenRepository;
  let prisma: {
    passwordResetToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const token = PasswordResetToken.restore({
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
      passwordResetToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    repository = new PrismaPasswordResetTokenRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createToken', () => {
    it('persists the token and returns the mapped domain entity', async () => {
      prisma.passwordResetToken.create.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.createToken(token);

      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
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

  describe('getTokenByJti', () => {
    it('returns the mapped domain entity when a live token matches', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue({
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        deletedAt: null,
        userId: token.userId,
      });

      const result = await repository.getTokenByJti('jti-value');

      expect(prisma.passwordResetToken.findFirst).toHaveBeenCalledWith({
        where: { jti: 'jti-value', deletedAt: null },
      });
      expect(result).toEqual(token);
    });

    it('returns null when no live token matches', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      const result = await repository.getTokenByJti('missing');

      expect(result).toBeNull();
    });
  });

  describe('consumeToken', () => {
    it('soft-deletes the token and returns the mapped domain entity', async () => {
      const consumed = PasswordResetToken.consume(token);
      prisma.passwordResetToken.update.mockResolvedValue({
        id: consumed.id,
        jti: consumed.jti,
        expiresAt: consumed.expiresAt,
        createdAt: consumed.createdAt,
        updatedAt: consumed.updatedAt,
        deletedAt: consumed.deletedAt,
        userId: consumed.userId,
      });

      const result = await repository.consumeToken(consumed);

      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: consumed.id },
        data: {
          updatedAt: consumed.updatedAt,
          deletedAt: consumed.deletedAt,
        },
      });
      expect(result).toEqual(consumed);
    });
  });
});
