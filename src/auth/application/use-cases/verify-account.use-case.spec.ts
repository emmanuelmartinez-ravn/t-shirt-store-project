import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { User } from '../../domain/models/user';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { VerifyAccountUseCase } from './verify-account.use-case';

describe('VerifyAccountUseCase', () => {
  let useCase: VerifyAccountUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let accountActivationTokenRepository: jest.Mocked<AccountActivationTokenRepository>;

  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'hashed',
    avatar: '',
    disabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
    };
    accountActivationTokenRepository = {
      createToken: jest.fn(),
      deleteExpiredTokens: jest.fn(),
      getTokenByJti: jest.fn(),
      consumeToken: jest.fn(),
      getValidTokenByUserId: jest.fn(),
    };

    useCase = new VerifyAccountUseCase(
      userRepository,
      accountActivationTokenRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('activates the user and consumes the token', async () => {
    const validToken = AccountActivationToken.restore({
      id: 'token-id',
      jti: 'jti-value',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      userId: user.id,
    });
    accountActivationTokenRepository.getTokenByJti.mockResolvedValue(
      validToken,
    );
    userRepository.getUserById.mockResolvedValue(user);
    const activatedUser = User.restore({ ...user, disabled: false });
    userRepository.activateUser.mockResolvedValue(activatedUser);

    const result = await useCase.execute('jti-value');

    expect(accountActivationTokenRepository.getTokenByJti).toHaveBeenCalledWith(
      'jti-value',
    );
    const [activateArg] = userRepository.activateUser.mock.calls[0];
    expect(activateArg.disabled).toBe(false);
    expect(accountActivationTokenRepository.consumeToken).toHaveBeenCalledWith(
      validToken,
    );
    expect(result).toBe(activatedUser);
  });

  it('translates a missing token into a BadRequestException', async () => {
    accountActivationTokenRepository.getTokenByJti.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(
      BadRequestException,
    );
    expect(userRepository.getUserById).not.toHaveBeenCalled();
  });

  it('translates an expired token into a BadRequestException', async () => {
    const expiredToken = AccountActivationToken.restore({
      id: 'token-id',
      jti: 'jti-value',
      expiresAt: new Date(Date.now() - 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      userId: user.id,
    });
    accountActivationTokenRepository.getTokenByJti.mockResolvedValue(
      expiredToken,
    );

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      BadRequestException,
    );
    expect(userRepository.getUserById).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    accountActivationTokenRepository.getTokenByJti.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('jti-value')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
