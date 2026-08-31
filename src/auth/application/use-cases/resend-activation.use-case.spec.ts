import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EmailQueueService } from '../../../mail/services/email-queue.service';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { User } from '../../domain/models/user';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { ResendActivationUseCase } from './resend-activation.use-case';

describe('ResendActivationUseCase', () => {
  let useCase: ResendActivationUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let accountActivationTokenRepository: jest.Mocked<AccountActivationTokenRepository>;
  let emailQueueService: jest.Mocked<EmailQueueService>;

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
    emailQueueService = {
      enqueueAccountVerificationEmail: jest.fn(),
    };

    useCase = new ResendActivationUseCase(
      userRepository,
      accountActivationTokenRepository,
      emailQueueService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('returns the existing valid token without creating a new one', async () => {
    userRepository.getUserById.mockResolvedValue(user);
    const existingToken = AccountActivationToken.restore({
      id: 'token-id',
      jti: 'jti-value',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      userId: user.id,
    });
    accountActivationTokenRepository.getValidTokenByUserId.mockResolvedValue(
      existingToken,
    );

    const result = await useCase.execute(user.id);

    expect(result).toEqual({ token: existingToken, created: false });
    expect(accountActivationTokenRepository.createToken).not.toHaveBeenCalled();
    expect(
      emailQueueService.enqueueAccountVerificationEmail,
    ).toHaveBeenCalledWith({ to: user.email, token: existingToken.jti });
  });

  it('creates a new token when none are valid', async () => {
    userRepository.getUserById.mockResolvedValue(user);
    accountActivationTokenRepository.getValidTokenByUserId.mockResolvedValue(
      null,
    );
    accountActivationTokenRepository.createToken.mockImplementation((token) =>
      Promise.resolve(token),
    );

    const result = await useCase.execute(user.id);

    const [createdTokenArg] =
      accountActivationTokenRepository.createToken.mock.calls[0];
    expect(createdTokenArg.userId).toBe(user.id);
    expect(createdTokenArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result).toEqual({ token: createdTokenArg, created: true });
    expect(
      emailQueueService.enqueueAccountVerificationEmail,
    ).toHaveBeenCalledWith({ to: user.email, token: createdTokenArg.jti });
  });

  it('still returns the token when enqueuing the verification email fails', async () => {
    userRepository.getUserById.mockResolvedValue(user);
    const existingToken = AccountActivationToken.restore({
      id: 'token-id',
      jti: 'jti-value',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      userId: user.id,
    });
    accountActivationTokenRepository.getValidTokenByUserId.mockResolvedValue(
      existingToken,
    );
    emailQueueService.enqueueAccountVerificationEmail.mockRejectedValue(
      new Error('queue unavailable'),
    );

    const result = await useCase.execute(user.id);

    expect(result).toEqual({ token: existingToken, created: false });
  });

  it('translates a missing user into a NotFoundException', async () => {
    userRepository.getUserById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(
      accountActivationTokenRepository.getValidTokenByUserId,
    ).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserById.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute(user.id)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
