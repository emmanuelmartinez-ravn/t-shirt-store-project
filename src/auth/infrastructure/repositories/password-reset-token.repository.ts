import { PasswordResetToken } from '../../domain/models/password-reset-token';

export abstract class PasswordResetTokenRepository {
  abstract createToken(token: PasswordResetToken): Promise<PasswordResetToken>;
  abstract getTokenByJti(jti: string): Promise<PasswordResetToken | null>;
  abstract consumeToken(token: PasswordResetToken): Promise<PasswordResetToken>;
}
