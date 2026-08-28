import { Injectable, Logger } from '@nestjs/common';
import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';

@Injectable()
export class DeleteExpiredAccountActivationTokensUseCase {
  private readonly logger: Logger = new Logger(
    DeleteExpiredAccountActivationTokensUseCase.name,
  );

  constructor(
    private readonly accountActivationTokenRepository: AccountActivationTokenRepository,
  ) {}

  async execute(): Promise<number> {
    const count =
      await this.accountActivationTokenRepository.deleteExpiredTokens(
        new Date(),
      );

    if (count > 0) {
      this.logger.log(
        `Soft-deleted ${count} expired account activation token(s)`,
      );
    }

    return count;
  }
}
