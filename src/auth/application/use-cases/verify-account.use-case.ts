import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InvalidActivationTokenError } from '../../domain/errors/invalid-activation-token';
import { UserNotFoundError } from '../../domain/errors/user-not-found';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { User } from '../../domain/models/user';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

@Injectable()
export class VerifyAccountUseCase {
  private readonly logger: Logger = new Logger(VerifyAccountUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountActivationTokenRepository: AccountActivationTokenRepository,
  ) {}

  async execute(token: string): Promise<User> {
    try {
      const activationToken =
        await this.accountActivationTokenRepository.getTokenByJti(token);

      if (!activationToken || activationToken.isExpired()) {
        throw new InvalidActivationTokenError();
      }

      const user = await this.userRepository.getUserById(
        activationToken.userId,
      );

      if (!user) {
        throw new UserNotFoundError(activationToken.userId);
      }

      const activatedUser = User.activate(user);
      const persistedUser =
        await this.userRepository.activateUser(activatedUser);

      await this.accountActivationTokenRepository.consumeToken(
        AccountActivationToken.consume(activationToken),
      );

      this.logger.log(`Activated user ${persistedUser.email}`);
      return persistedUser;
    } catch (error) {
      this.logger.error('Failed to verify account', error);

      if (error instanceof InvalidActivationTokenError) {
        throw new BadRequestException({
          error: 'Activation token is invalid or expired',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
