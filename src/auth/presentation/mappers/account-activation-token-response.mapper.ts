import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { AccountActivationTokenResponseDto } from '../dto/account-activation-token-response';

export class AccountActivationTokenResponseMapper {
  static toResponse(
    token: AccountActivationToken,
  ): AccountActivationTokenResponseDto {
    return {
      token: token.jti,
      expiresAt: token.expiresAt,
    };
  }
}
