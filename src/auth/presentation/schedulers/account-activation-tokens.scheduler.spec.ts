import { DeleteExpiredAccountActivationTokensUseCase } from '../../application/use-cases/delete-expired-account-activation-tokens.use-case';
import { AccountActivationTokensScheduler } from './account-activation-tokens.scheduler';

describe('AccountActivationTokensScheduler', () => {
  let scheduler: AccountActivationTokensScheduler;
  let deleteExpiredAccountActivationTokensUseCase: jest.Mocked<DeleteExpiredAccountActivationTokensUseCase>;

  beforeEach(() => {
    deleteExpiredAccountActivationTokensUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteExpiredAccountActivationTokensUseCase>;

    scheduler = new AccountActivationTokensScheduler(
      deleteExpiredAccountActivationTokensUseCase,
    );
  });

  it('is defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('delegates to the use case', async () => {
    deleteExpiredAccountActivationTokensUseCase.execute.mockResolvedValue(2);

    await scheduler.handleExpiredAccountActivationTokens();

    expect(
      deleteExpiredAccountActivationTokensUseCase.execute,
    ).toHaveBeenCalled();
  });
});
