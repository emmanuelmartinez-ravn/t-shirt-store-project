import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EmailQueueService } from '../../../mail/services/email-queue.service';
import { getPasswordResetTokenTtlMinutes } from '../config/password-reset-token-ttl';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { PasswordResetTokenRepository } from '../../infrastructure/repositories/password-reset-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger: Logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async execute(email: string): Promise<void> {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (!user) {
        this.logger.debug(
          `Password reset requested for unknown email ${email}`,
        );
        return;
      }

      const ttlMinutes = getPasswordResetTokenTtlMinutes();
      const newToken = PasswordResetToken.create({
        userId: user.id,
        ttlMinutes,
      });
      const token =
        await this.passwordResetTokenRepository.createToken(newToken);

      try {
        await this.emailQueueService.enqueuePasswordResetEmail({
          to: user.email,
          token: token.jti,
        });
      } catch (emailError) {
        this.logger.error(
          `Failed to enqueue password reset email for ${user.email}`,
          emailError,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process forgot-password request for ${email}`,
        error,
      );

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
