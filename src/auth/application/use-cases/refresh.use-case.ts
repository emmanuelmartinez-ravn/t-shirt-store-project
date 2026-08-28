import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { InvalidRefreshTokenError } from '../../domain/errors/invalid-refresh-token';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import {
  AuthTokens,
  IssueAuthTokensService,
} from '../services/issue-auth-tokens.service';

@Injectable()
export class RefreshUseCase {
  private readonly logger: Logger = new Logger(RefreshUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly issueAuthTokensService: IssueAuthTokensService,
  ) {}

  async execute(refreshToken: string): Promise<AuthTokens> {
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

      const user = await this.userRepository.getUserById(existingToken.userId);

      if (!user || user.disabled) {
        throw new InvalidRefreshTokenError();
      }

      const role = await this.roleRepository.getRoleById(user.roleId);

      if (!role) {
        throw new Error(`Role "${user.roleId}" not found for user ${user.id}`);
      }

      await this.refreshTokenRepository.revokeToken(
        RefreshToken.revoke(existingToken),
      );

      const tokens = await this.issueAuthTokensService.issueTokens(
        user,
        role.name,
      );
      this.logger.log(`Refreshed tokens for user ${user.email}`);
      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);

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
