import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { RefreshToken } from '../../domain/models/refresh-token';
import { RefreshTokenPersistenceMapper } from '../mappers/refresh-token-persistence.mapper';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createToken(token: RefreshToken): Promise<RefreshToken> {
    const record = await this.prisma.refreshToken.create({
      data: {
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        userId: token.userId,
      },
    });

    return RefreshTokenPersistenceMapper.toDomain(record);
  }

  async getTokenByJti(jti: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { jti, deletedAt: null },
    });

    return record ? RefreshTokenPersistenceMapper.toDomain(record) : null;
  }

  async revokeToken(token: RefreshToken): Promise<RefreshToken> {
    const record = await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        revokedAt: token.revokedAt,
        updatedAt: token.updatedAt,
      },
    });

    return RefreshTokenPersistenceMapper.toDomain(record);
  }
}
