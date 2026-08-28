import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeleteExpiredAccountActivationTokensUseCase } from '../../application/use-cases/delete-expired-account-activation-tokens.use-case';

@Injectable()
export class AccountActivationTokensScheduler {
  constructor(
    private readonly deleteExpiredAccountActivationTokensUseCase: DeleteExpiredAccountActivationTokensUseCase,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredAccountActivationTokens(): Promise<void> {
    await this.deleteExpiredAccountActivationTokensUseCase.execute();
  }
}
