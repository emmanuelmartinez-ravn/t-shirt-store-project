import {
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../../roles/domain/models/role';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { User } from '../../domain/models/user';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { IssueAuthTokensService } from '../services/issue-auth-tokens.service';
import { SignInUseCase } from './sign-in.use-case';

describe('SignInUseCase', () => {
  let useCase: SignInUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let issueAuthTokensService: jest.Mocked<IssueAuthTokensService>;

  const role = Role.restore({
    id: 'role-id',
    name: 'client',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const signInProps = {
    email: 'joe.doe@example.com',
    password: 'Secret1!',
  };

  let hashedPassword: string;
  let user: User;

  beforeEach(async () => {
    hashedPassword = await bcrypt.hash(signInProps.password, 4);
    user = User.restore({
      id: 'user-id',
      firstName: 'Joe',
      lastName: 'Doe',
      email: signInProps.email,
      hashedPassword,
      avatar: '',
      disabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      roleId: role.id,
    });

    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
    };
    roleRepository = {
      createRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleByName: jest.fn(),
      getRoleById: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };
    issueAuthTokensService = {
      issueTokens: jest.fn(),
    } as unknown as jest.Mocked<IssueAuthTokensService>;

    useCase = new SignInUseCase(
      userRepository,
      roleRepository,
      issueAuthTokensService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('issues tokens for a valid, enabled user', async () => {
    userRepository.getUserByEmail.mockResolvedValue(user);
    roleRepository.getRoleById.mockResolvedValue(role);
    const tokens = { accessToken: 'access', refreshToken: 'refresh' };
    issueAuthTokensService.issueTokens.mockResolvedValue(tokens);

    const result = await useCase.execute(signInProps);

    expect(userRepository.getUserByEmail).toHaveBeenCalledWith(
      signInProps.email,
    );
    expect(issueAuthTokensService.issueTokens).toHaveBeenCalledWith(
      user,
      role.name,
    );
    expect(result).toBe(tokens);
  });

  it('translates a missing user into an UnauthorizedException', async () => {
    userRepository.getUserByEmail.mockResolvedValue(null);

    await expect(useCase.execute(signInProps)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(issueAuthTokensService.issueTokens).not.toHaveBeenCalled();
  });

  it('translates a wrong password into an UnauthorizedException', async () => {
    userRepository.getUserByEmail.mockResolvedValue(user);

    await expect(
      useCase.execute({ ...signInProps, password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(issueAuthTokensService.issueTokens).not.toHaveBeenCalled();
  });

  it('translates a disabled user into a ForbiddenException', async () => {
    const disabledUser = User.restore({ ...user, disabled: true });
    userRepository.getUserByEmail.mockResolvedValue(disabledUser);

    await expect(useCase.execute(signInProps)).rejects.toThrow(
      ForbiddenException,
    );
    expect(issueAuthTokensService.issueTokens).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    userRepository.getUserByEmail.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute(signInProps)).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
