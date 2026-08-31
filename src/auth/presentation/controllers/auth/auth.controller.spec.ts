import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { User } from '../../../domain/models/user';
import { AccountActivationToken } from '../../../domain/models/account-activation-token';
import { RefreshUseCase } from '../../../application/use-cases/refresh.use-case';
import { ResendActivationUseCase } from '../../../application/use-cases/resend-activation.use-case';
import { SignInUseCase } from '../../../application/use-cases/sign-in.use-case';
import { SignOutUseCase } from '../../../application/use-cases/sign-out.use-case';
import { SignUpUseCase } from '../../../application/use-cases/sign-up.use-case';
import { VerifyAccountUseCase } from '../../../application/use-cases/verify-account.use-case';
import { AccountActivationTokenResponseMapper } from '../../mappers/account-activation-token-response.mapper';
import { UserResponseMapper } from '../../mappers/user-response.mapper';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let signUpUseCase: jest.Mocked<SignUpUseCase>;
  let verifyAccountUseCase: jest.Mocked<VerifyAccountUseCase>;
  let resendActivationUseCase: jest.Mocked<ResendActivationUseCase>;
  let signInUseCase: jest.Mocked<SignInUseCase>;
  let refreshUseCase: jest.Mocked<RefreshUseCase>;
  let signOutUseCase: jest.Mocked<SignOutUseCase>;

  beforeEach(() => {
    signUpUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SignUpUseCase>;
    verifyAccountUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VerifyAccountUseCase>;
    resendActivationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResendActivationUseCase>;
    signInUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SignInUseCase>;
    refreshUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RefreshUseCase>;
    signOutUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<SignOutUseCase>;

    controller = new AuthController(
      signUpUseCase,
      verifyAccountUseCase,
      resendActivationUseCase,
      signInUseCase,
      refreshUseCase,
      signOutUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('delegates to the use case and returns the mapped response', async () => {
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
      signUpUseCase.execute.mockResolvedValue(user);

      const dto = {
        firstName: 'Joe',
        lastName: 'Doe',
        email: 'joe.doe@example.com',
        password: 'Secret1!',
      };

      const result = await controller.signUp(dto);

      expect(signUpUseCase.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('verify', () => {
    it('delegates to the use case and returns the mapped response', async () => {
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
      verifyAccountUseCase.execute.mockResolvedValue(user);

      const result = await controller.verify({ token: 'jti-value' });

      expect(verifyAccountUseCase.execute).toHaveBeenCalledWith('jti-value');
      expect(result).toEqual(UserResponseMapper.toResponse(user));
    });
  });

  describe('resendActivation', () => {
    const token = AccountActivationToken.restore({
      id: 'token-id',
      jti: 'jti-value',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      userId: 'user-id',
    });

    const mockResponse = () =>
      ({
        status: jest.fn(),
      }) as unknown as jest.Mocked<Response>;

    it('responds 200 and returns the mapped token when an existing one was reused', async () => {
      resendActivationUseCase.execute.mockResolvedValue({
        token,
        created: false,
      });
      const res = mockResponse();

      const result = await controller.resendActivation(
        { email: 'joe.doe@example.com' },
        res,
      );

      expect(resendActivationUseCase.execute).toHaveBeenCalledWith(
        'joe.doe@example.com',
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(result).toEqual(
        AccountActivationTokenResponseMapper.toResponse(token),
      );
    });

    it('responds 201 and returns the mapped token when a new one was created', async () => {
      resendActivationUseCase.execute.mockResolvedValue({
        token,
        created: true,
      });
      const res = mockResponse();

      const result = await controller.resendActivation(
        { email: 'joe.doe@example.com' },
        res,
      );

      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(result).toEqual(
        AccountActivationTokenResponseMapper.toResponse(token),
      );
    });
  });

  describe('signIn', () => {
    it('delegates to the use case and returns the tokens', async () => {
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };
      signInUseCase.execute.mockResolvedValue(tokens);

      const dto = { email: 'joe.doe@example.com', password: 'Secret1!' };
      const result = await controller.signIn(dto);

      expect(signInUseCase.execute).toHaveBeenCalledWith(dto);
      expect(result).toBe(tokens);
    });
  });

  describe('refresh', () => {
    it('delegates to the use case and returns the tokens', async () => {
      const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      refreshUseCase.execute.mockResolvedValue(tokens);

      const result = await controller.refresh({
        refreshToken: 'old-refresh',
      });

      expect(refreshUseCase.execute).toHaveBeenCalledWith('old-refresh');
      expect(result).toBe(tokens);
    });
  });

  describe('signOut', () => {
    it('delegates to the use case', async () => {
      signOutUseCase.execute.mockResolvedValue(undefined);

      await controller.signOut({ refreshToken: 'old-refresh' });

      expect(signOutUseCase.execute).toHaveBeenCalledWith('old-refresh');
    });
  });
});
