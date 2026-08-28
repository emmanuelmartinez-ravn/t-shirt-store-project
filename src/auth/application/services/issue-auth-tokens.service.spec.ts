import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/models/user';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { IssueAuthTokensService } from './issue-auth-tokens.service';

describe('IssueAuthTokensService', () => {
  let service: IssueAuthTokensService;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: '',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    refreshTokenRepository = {
      createToken: jest.fn(),
      getTokenByJti: jest.fn(),
      revokeToken: jest.fn(),
    };

    service = new IssueAuthTokensService(jwtService, refreshTokenRepository);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('signs a JWT access token carrying the role and persists a new refresh token', async () => {
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
    refreshTokenRepository.createToken.mockImplementation((token) =>
      Promise.resolve(token),
    );

    const result = await service.issueTokens(user, 'client');

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: user.id, email: user.email, role: 'client', roleId: user.roleId },
      { expiresIn: '15m' },
    );
    const [createdTokenArg] = refreshTokenRepository.createToken.mock.calls[0];
    expect(createdTokenArg.userId).toBe(user.id);
    expect(createdTokenArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      refreshToken: createdTokenArg.jti,
    });
  });
});
