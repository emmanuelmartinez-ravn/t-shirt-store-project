import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { User } from '../../domain/models/user';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordResetTokenRepository: jest.Mocked<PasswordResetTokenRepository>;

  const user = User.restore({
    id: 'user-id',
    firstName: 'Joe',
    lastName: 'Doe',
    email: 'joe.doe@example.com',
    hashedPassword: 'old-hashed',
    avatar: '',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roleId: 'role-id',
  });

  const validToken = PasswordResetToken.restore({
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
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
    };
    passwordResetTokenRepository = {
      createToken: jest.fn(),
      getTokenByJti: jest.fn(),
      consumeToken: jest.fn(),
    };

    useCase = new ResetPasswordUseCase(
      userRepository,
      passwordResetTokenRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('hashes and persists the new password, then consumes the token', async () => {
      passwordResetTokenRepository.getTokenByJti.mockResolvedValue(validToken);
      userRepository.getUserById.mockResolvedValue(user);
      userRepository.updatePassword.mockImplementation((updated) =>
        Promise.resolve(updated),
      );

      const result = await useCase.execute({
        token: 'jti-value',
        newPassword: 'NewSecret1!',
      });

      expect(passwordResetTokenRepository.getTokenByJti).toHaveBeenCalledWith(
        'jti-value',
      );
      expect(userRepository.getUserById).toHaveBeenCalledWith(user.id);
      const [persistedArg] = userRepository.updatePassword.mock.calls[0];
      expect(persistedArg.hashedPassword).not.toBe(user.hashedPassword);
      expect(
        bcrypt.compareSync('NewSecret1!', persistedArg.hashedPassword),
      ).toBe(true);
      expect(passwordResetTokenRepository.consumeToken).toHaveBeenCalledWith(
        validToken,
      );
      expect(result.hashedPassword).toBe(persistedArg.hashedPassword);
    });

    it('translates a missing token into a BadRequestException', async () => {
      passwordResetTokenRepository.getTokenByJti.mockResolvedValue(null);

      await expect(
        useCase.execute({ token: 'missing', newPassword: 'NewSecret1!' }),
      ).rejects.toThrow(
        new BadRequestException({
          error: 'Password reset token is invalid or expired',
          details: [],
        }),
      );
      expect(userRepository.getUserById).not.toHaveBeenCalled();
    });

    it('translates an expired token into a BadRequestException', async () => {
      const expiredToken = PasswordResetToken.restore({
        ...validToken,
        expiresAt: new Date(Date.now() - 60_000),
      });
      passwordResetTokenRepository.getTokenByJti.mockResolvedValue(
        expiredToken,
      );

      await expect(
        useCase.execute({ token: 'jti-value', newPassword: 'NewSecret1!' }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.getUserById).not.toHaveBeenCalled();
    });

    it('translates a missing user into a NotFoundException', async () => {
      passwordResetTokenRepository.getTokenByJti.mockResolvedValue(validToken);
      userRepository.getUserById.mockResolvedValue(null);

      await expect(
        useCase.execute({ token: 'jti-value', newPassword: 'NewSecret1!' }),
      ).rejects.toThrow(
        new NotFoundException({ error: 'User not found', details: [] }),
      );
      expect(userRepository.updatePassword).not.toHaveBeenCalled();
      expect(passwordResetTokenRepository.consumeToken).not.toHaveBeenCalled();
    });

    it('does not consume the token when persisting the new password fails', async () => {
      passwordResetTokenRepository.getTokenByJti.mockResolvedValue(validToken);
      userRepository.getUserById.mockResolvedValue(user);
      userRepository.updatePassword.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({ token: 'jti-value', newPassword: 'NewSecret1!' }),
      ).rejects.toThrow(InternalServerErrorException);
      expect(passwordResetTokenRepository.consumeToken).not.toHaveBeenCalled();
    });

    it('translates unexpected errors into an InternalServerErrorException', async () => {
      passwordResetTokenRepository.getTokenByJti.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({ token: 'jti-value', newPassword: 'NewSecret1!' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
