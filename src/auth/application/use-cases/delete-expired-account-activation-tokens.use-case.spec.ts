import { AccountActivationTokenRepository } from '../../infrastructure/repositories/account-activation-token.repository';
import { DeleteExpiredAccountActivationTokensUseCase } from './delete-expired-account-activation-tokens.use-case';

describe('DeleteExpiredAccountActivationTokensUseCase', () => {
  let useCase: DeleteExpiredAccountActivationTokensUseCase;
  let accountActivationTokenRepository: jest.Mocked<AccountActivationTokenRepository>;

  beforeEach(() => {
    accountActivationTokenRepository = {
      createToken: jest.fn(),
      deleteExpiredTokens: jest.fn(),
      getTokenByJti: jest.fn(),
      consumeToken: jest.fn(),
      getValidTokenByUserId: jest.fn(),
    };

    useCase = new DeleteExpiredAccountActivationTokensUseCase(
      accountActivationTokenRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes expired tokens and returns the count', async () => {
    accountActivationTokenRepository.deleteExpiredTokens.mockResolvedValue(3);

    const result = await useCase.execute();

    expect(
      accountActivationTokenRepository.deleteExpiredTokens,
    ).toHaveBeenCalledWith(expect.any(Date));
    expect(result).toBe(3);
  });
});
