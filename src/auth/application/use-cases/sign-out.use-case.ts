import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';

@Injectable()
export class SignOutUseCase {
  private readonly logger: Logger = new Logger(SignOutUseCase.name);

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    try {
      const existingToken =
        await this.refreshTokenRepository.getTokenByJti(refreshToken);

      if (
        !existingToken ||
        existingToken.isExpired() ||
        existingToken.isRevoked()
      ) {
        throw new InvalidRefreshTokenError();
      }

      await this.refreshTokenRepository.revokeToken(
        RefreshToken.revoke(existingToken),
      );
      this.logger.log(`Signed out user ${existingToken.userId}`);
    } catch (error) {
      this.logger.error('Failed to sign out', error);

      if (error instanceof InvalidRefreshTokenError) {
        throw new UnauthorizedException({
          error: 'Refresh token is invalid or expired',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
