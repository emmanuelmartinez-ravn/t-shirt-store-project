import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role } from '../../../roles/domain/models/role';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { EmailQueueService } from '../../../mail/services/email-queue.service';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists';
import { User } from '../../domain/models/user';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { SignUpUseCase } from './sign-up.use-case';

describe('SignUpUseCase', () => {
  let useCase: SignUpUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let accountActivationTokenRepository: jest.Mocked<AccountActivationTokenRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let emailQueueService: jest.Mocked<EmailQueueService>;

  const role = Role.restore({
    id: 'role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const signUpProps = {
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    password: 'Secret1!',
  };

  beforeEach(() => {
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      setDisabled: jest.fn(),
      deleteUser: jest.fn(),
      anonymizeUser: jest.fn(),
    };
    accountActivationTokenRepository = {
      createToken: jest.fn(),
      deleteExpiredTokens: jest.fn(),
      getTokenByJti: jest.fn(),
      consumeToken: jest.fn(),
      getValidTokenByUserId: jest.fn(),
    };
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };
    emailQueueService = {
      enqueueAccountVerificationEmail: jest.fn(),
      enqueuePasswordResetEmail: jest.fn(),
    };

    useCase = new SignUpUseCase(
      userRepository,
      accountActivationTokenRepository,
      roleRepository,
      emailQueueService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('creates a disabled user without an avatar under the default role, and an activation token', async () => {
    roleRepository.getRoleByName.mockResolvedValue(role);
    const createdUser = User.restore({
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
      roleId: role.id,
    });
    userRepository.createUser.mockResolvedValue(createdUser);
    accountActivationTokenRepository.createToken.mockImplementation((token) =>
      Promise.resolve(token),
    );

    const result = await useCase.execute(signUpProps);

    expect(roleRepository.getRoleByName).toHaveBeenCalledWith('client');
    const [createdUserArg] = userRepository.createUser.mock.calls[0];
    expect(createdUserArg.avatar).toBe('');
    expect(createdUserArg.disabled).toBe(true);
    expect(createdUserArg.roleId).toBe(role.id);
    expect(createdUserArg.hashedPassword).not.toBe(signUpProps.password);

    const [tokenArg] =
      accountActivationTokenRepository.createToken.mock.calls[0];
    expect(tokenArg.userId).toBe(createdUser.id);
    expect(tokenArg.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(
      emailQueueService.enqueueAccountVerificationEmail,
    ).toHaveBeenCalledWith({ to: createdUser.email, token: tokenArg.jti });
    expect(result).toBe(createdUser);
  });

  it('still returns the created user when enqueuing the verification email fails', async () => {
    roleRepository.getRoleByName.mockResolvedValue(role);
    const createdUser = User.restore({
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
      roleId: role.id,
    });
    userRepository.createUser.mockResolvedValue(createdUser);
    accountActivationTokenRepository.createToken.mockImplementation((token) =>
      Promise.resolve(token),
    );
    emailQueueService.enqueueAccountVerificationEmail.mockRejectedValue(
      new Error('queue unavailable'),
    );

    const result = await useCase.execute(signUpProps);

    expect(result).toBe(createdUser);
  });

  it('translates a missing default role into an InternalServerErrorException', async () => {
    roleRepository.getRoleByName.mockResolvedValue(null);

    await expect(useCase.execute(signUpProps)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(userRepository.createUser).not.toHaveBeenCalled();
  });

  it('translates UserAlreadyExistsError into a ConflictException', async () => {
    roleRepository.getRoleByName.mockResolvedValue(role);
    userRepository.createUser.mockRejectedValue(
      new UserAlreadyExistsError(signUpProps.email),
    );

    await expect(useCase.execute(signUpProps)).rejects.toThrow(
      ConflictException,
    );
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    roleRepository.getRoleByName.mockResolvedValue(role);
    userRepository.createUser.mockRejectedValue(new Error('connection lost'));

    await expect(useCase.execute(signUpProps)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
