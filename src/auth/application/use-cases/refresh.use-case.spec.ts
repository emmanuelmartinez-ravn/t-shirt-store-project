import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../../roles/domain/models/role';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { RefreshToken } from '../../domain/models/refresh-token';
import { User } from '../../domain/models/user';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { IssueAuthTokensService } from '../services/issue-auth-tokens.service';
import { RefreshUseCase } from './refresh.use-case';

describe('RefreshUseCase', () => {
  let useCase: RefreshUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let issueAuthTokensService: jest.Mocked<IssueAuthTokensService>;

  const role = Role.restore({
    id: 'role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

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
    roleId: role.id,
  });

  const validToken = RefreshToken.restore({
    id: 'token-id',
    jti: 'jti-value',
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    userId: user.id,
  });

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      updatePassword: jest.fn(),
    };
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };
    refreshTokenRepository = {
      createToken: jest.fn(),
      getTokenByJti: jest.fn(),
      revokeToken: jest.fn(),
    };
    issueAuthTokensService = {
      issueTokens: jest.fn(),
    } as unknown as jest.Mocked<IssueAuthTokensService>;

    useCase = new RefreshUseCase(
      userRepository,
      roleRepository,
      refreshTokenRepository,
      issueAuthTokensService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('revokes the old token and issues a new token pair', async () => {
    refreshTokenRepository.getTokenByJti.mockResolvedValue(validToken);
    userRepository.getUserById.mockResolvedValue(user);
    roleRepository.getRoleById.mockResolvedValue(role);
    const tokens = { accessToken: 'access', refreshToken: 'new-refresh' };
    issueAuthTokensService.issueTokens.mockResolvedValue(tokens);

    const result = await useCase.execute('jti-value');

    const [revokedArg] = refreshTokenRepository.revokeToken.mock.calls[0];
    expect(revokedArg.id).toBe(validToken.id);
    expect(revokedArg.isRevoked()).toBe(true);
    expect(issueAuthTokensService.issueTokens).toHaveBeenCalledWith(
      user,
      role.name,
    );
    expect(result).toBe(tokens);
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
  });

  it('translates a revoked token into an UnauthorizedException', async () => {
    const revokedToken = RefreshToken.restore({
      ...validToken,
      deletedAt: new Date(),
    });
    refreshTokenRepository.getTokenByJti.mockResolvedValue(revokedToken);
    userRepository.getUserById.mockResolvedValue(user);
    roleRepository.getRoleById.mockResolvedValue(role);

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(refreshTokenRepository.revokeToken).not.toHaveBeenCalled();
  });

  it('translates a disabled user into an UnauthorizedException', async () => {
    refreshTokenRepository.getTokenByJti.mockResolvedValue(validToken);
    const disabledUser = User.restore({ ...user, disabled: true });
    userRepository.getUserById.mockResolvedValue(disabledUser);

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
