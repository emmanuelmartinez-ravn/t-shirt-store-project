import { InternalServerErrorException } from '@nestjs/common';
import { EmailQueueService } from '../../../mail/services/email-queue.service';
import { User } from '../../domain/models/user';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordResetTokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let emailQueueService: jest.Mocked<EmailQueueService>;

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
    userRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      activateUser: jest.fn(),
      promoteUser: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      setDisabled: jest.fn(),
    };
    passwordResetTokenRepository = {
      createToken: jest.fn(),
      getTokenByJti: jest.fn(),
      consumeToken: jest.fn(),
    };
    emailQueueService = {
      enqueueAccountVerificationEmail: jest.fn(),
      enqueuePasswordResetEmail: jest.fn(),
    };

    useCase = new ForgotPasswordUseCase(
      userRepository,
      passwordResetTokenRepository,
      emailQueueService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('creates a reset token and enqueues the reset email when the user exists', async () => {
      userRepository.getUserByEmail.mockResolvedValue(user);
      passwordResetTokenRepository.createToken.mockImplementation((token) =>
        Promise.resolve(token),
      );

      const result = await useCase.execute(user.email);

      expect(userRepository.getUserByEmail).toHaveBeenCalledWith(user.email);
      const [tokenArg] = passwordResetTokenRepository.createToken.mock.calls[0];
      expect(tokenArg.userId).toBe(user.id);
      expect(emailQueueService.enqueuePasswordResetEmail).toHaveBeenCalledWith({
        to: user.email,
        token: tokenArg.jti,
      });
      expect(result).toBeUndefined();
    });

    it('does not create a token or enqueue an email when no user matches the email, and does not throw', async () => {
      userRepository.getUserByEmail.mockResolvedValue(null);

      const result = await useCase.execute('missing@example.com');

      expect(passwordResetTokenRepository.createToken).not.toHaveBeenCalled();
      expect(
        emailQueueService.enqueuePasswordResetEmail,
      ).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('still resolves when enqueuing the reset email fails', async () => {
      userRepository.getUserByEmail.mockResolvedValue(user);
      passwordResetTokenRepository.createToken.mockImplementation((token) =>
        Promise.resolve(token),
      );
      emailQueueService.enqueuePasswordResetEmail.mockRejectedValue(
        new Error('queue unavailable'),
      );

      const result = await useCase.execute(user.email);

      expect(result).toBeUndefined();
    });

    it('translates an unexpected error from getUserByEmail into an InternalServerErrorException', async () => {
      userRepository.getUserByEmail.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(useCase.execute(user.email)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(passwordResetTokenRepository.createToken).not.toHaveBeenCalled();
    });

    it('translates an unexpected error from createToken into an InternalServerErrorException', async () => {
      userRepository.getUserByEmail.mockResolvedValue(user);
      passwordResetTokenRepository.createToken.mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(useCase.execute(user.email)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(
        emailQueueService.enqueuePasswordResetEmail,
      ).not.toHaveBeenCalled();
    });
  });
});
