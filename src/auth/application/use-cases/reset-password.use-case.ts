import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InvalidResetTokenError } from '../../domain/errors/invalid-reset-token';
import { UserNotFoundError } from '../../domain/errors/user-not-found';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { User } from '../../domain/models/user';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class ResetPasswordUseCase {
  private readonly logger: Logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  async execute(props: { token: string; newPassword: string }): Promise<User> {
    try {
      const resetToken = await this.passwordResetTokenRepository.getTokenByJti(
        props.token,
      );

      if (!resetToken || resetToken.isExpired()) {
        throw new InvalidResetTokenError();
      }

      const user = await this.userRepository.getUserById(resetToken.userId);

      if (!user) {
        throw new UserNotFoundError(resetToken.userId);
      }

      const hashedPassword = await bcrypt.hash(
        props.newPassword,
        PASSWORD_SALT_ROUNDS,
      );
      const updatedUser = User.changePassword(user, hashedPassword);
      const persistedUser =
        await this.userRepository.updatePassword(updatedUser);

      await this.passwordResetTokenRepository.consumeToken(
        PasswordResetToken.consume(resetToken),
      );

      this.logger.log(`Reset password for user ${persistedUser.email}`);
      return persistedUser;
    } catch (error) {
      this.logger.error('Failed to reset password', error);

      if (error instanceof InvalidResetTokenError) {
        throw new BadRequestException({
          error: 'Password reset token is invalid or expired',
          details: [],
        });
      }

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
