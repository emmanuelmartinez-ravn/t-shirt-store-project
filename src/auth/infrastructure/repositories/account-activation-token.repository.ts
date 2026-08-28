import { AccountActivationToken } from '../../domain/models/account-activation-token';

export abstract class AccountActivationTokenRepository {
  abstract createToken(
    token: AccountActivationToken,
  ): Promise<AccountActivationToken>;
  abstract deleteExpiredTokens(now: Date): Promise<number>;
  abstract getTokenByJti(jti: string): Promise<AccountActivationToken | null>;
  abstract consumeToken(
    token: AccountActivationToken,
  ): Promise<AccountActivationToken>;
  abstract getValidTokenByUserId(
    userId: string,
    now: Date,
  ): Promise<AccountActivationToken | null>;
}
