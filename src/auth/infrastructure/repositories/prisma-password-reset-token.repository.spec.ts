import { PrismaService } from '../../../prisma/services/prisma.service';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { PrismaPasswordResetTokenRepository } from './prisma-password-reset-token.repository';

describe('PrismaPasswordResetTokenRepository', () => {
  let repository: PrismaPasswordResetTokenRepository;
  let prisma: {
    passwordResetToken: {
      create: jest.Mock;
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
});
