import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../domain/models/user';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';

const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 15;
const REFRESH_TOKEN_TTL_MINUTES = 60;
const SECONDS_PER_MINUTE = 60;

function getAccessTokenTtlSeconds(): number {
  const configured = Number(process.env.ACCESS_TOKEN_TTL);
  const minutes =
    Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_ACCESS_TOKEN_TTL_MINUTES;

  return minutes * SECONDS_PER_MINUTE;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class IssueAuthTokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async issueTokens(user: User, roleName: string): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: roleName,
        roleId: user.roleId,
      },
      { expiresIn: getAccessTokenTtlSeconds() },
    );

    const refreshTokenEntity = RefreshToken.create({
      userId: user.id,
      ttlMinutes: REFRESH_TOKEN_TTL_MINUTES,
    });
    const persistedRefreshToken =
      await this.refreshTokenRepository.createToken(refreshTokenEntity);

    return { accessToken, refreshToken: persistedRefreshToken.jti };
  }
}
