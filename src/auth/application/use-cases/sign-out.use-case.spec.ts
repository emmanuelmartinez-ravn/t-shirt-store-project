import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { SignOutUseCase } from './sign-out.use-case';

describe('SignOutUseCase', () => {
  let useCase: SignOutUseCase;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  const validToken = RefreshToken.restore({
    id: 'token-id',
    jti: 'jti-value',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userId: 'user-id',
  });

  beforeEach(() => {
    refreshTokenRepository = {
      createToken: jest.fn(),
      getTokenByJti: jest.fn(),
      revokeToken: jest.fn(),
    };

    useCase = new SignOutUseCase(refreshTokenRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('revokes the refresh token', async () => {
    refreshTokenRepository.getTokenByJti.mockResolvedValue(validToken);
    refreshTokenRepository.revokeToken.mockImplementation((token) =>
      Promise.resolve(token),
    );

    await useCase.execute('jti-value');

    const [revokedArg] = refreshTokenRepository.revokeToken.mock.calls[0];
    expect(revokedArg.id).toBe(validToken.id);
    expect(revokedArg.isRevoked()).toBe(true);
  });

  it('translates a missing token into an UnauthorizedException', async () => {
    refreshTokenRepository.getTokenByJti.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('translates an expired token into an UnauthorizedException', async () => {
    const expiredToken = RefreshToken.restore({
      ...validToken,
      expiresAt: new Date(Date.now() - 60_000),
    });
    refreshTokenRepository.getTokenByJti.mockResolvedValue(expiredToken);

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('translates an already-revoked token into an UnauthorizedException', async () => {
    const revokedToken = RefreshToken.restore({
      ...validToken,
      deletedAt: new Date(),
    });
    refreshTokenRepository.getTokenByJti.mockResolvedValue(revokedToken);

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    refreshTokenRepository.getTokenByJti.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
