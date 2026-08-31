import { PasswordResetToken } from '../../domain/models/password-reset-token';

export abstract class PasswordResetTokenRepository {
  abstract createToken(token: PasswordResetToken): Promise<PasswordResetToken>;
}
