import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getAccountActivationTokenTtlMinutes } from '../config/account-activation-token-ttl';
import { UserNotFoundError } from '../../domain/errors/user-not-found';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';

export interface ResendActivationResult {
  token: AccountActivationToken;
  created: boolean;
}

@Injectable()
export class ResendActivationUseCase {
  private readonly logger: Logger = new Logger(ResendActivationUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountActivationTokenRepository: AccountActivationTokenRepository,
  ) {}

  async execute(userId: string): Promise<ResendActivationResult> {
    try {
      const user = await this.userRepository.getUserById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      const now = new Date();
      const existingToken =
        await this.accountActivationTokenRepository.getValidTokenByUserId(
          userId,
          now,
        );

      if (existingToken) {
        return { token: existingToken, created: false };
      }

      const ttlMinutes = getAccountActivationTokenTtlMinutes();
      const newToken = AccountActivationToken.create({ userId, ttlMinutes });
      const createdToken =
        await this.accountActivationTokenRepository.createToken(newToken);

      return { token: createdToken, created: true };
    } catch (error) {
      this.logger.error(
        `Failed to resend activation for user ${userId}`,
        error,
      );

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
