import { RefreshToken } from '../../domain/models/refresh-token';

export abstract class RefreshTokenRepository {
  abstract createToken(token: RefreshToken): Promise<RefreshToken>;
  abstract getTokenByJti(jti: string): Promise<RefreshToken | null>;
  abstract revokeToken(token: RefreshToken): Promise<RefreshToken>;
}
