import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User } from '../../domain/models/user';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenRepository } from '../../infrastructure/repositories/refresh-token.repository';

const DEFAULT_ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MINUTES = 60;

function getAccessTokenTtl(): JwtSignOptions['expiresIn'] {
  return (process.env.ACCESS_TOKEN_TTL ??
    DEFAULT_ACCESS_TOKEN_TTL) as JwtSignOptions['expiresIn'];
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
      { expiresIn: getAccessTokenTtl() },
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
