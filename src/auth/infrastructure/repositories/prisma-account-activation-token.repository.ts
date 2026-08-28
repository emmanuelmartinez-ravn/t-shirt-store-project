import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { AccountActivationToken } from '../../domain/models/account-activation-token';
import { AccountActivationTokenPersistenceMapper } from '../mappers/account-activation-token-persistence.mapper';
import { AccountActivationTokenRepository } from './account-activation-token.repository';

@Injectable()
export class PrismaAccountActivationTokenRepository extends AccountActivationTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createToken(
    token: AccountActivationToken,
  ): Promise<AccountActivationToken> {
    const record = await this.prisma.accountActivationToken.create({
      data: {
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        userId: token.userId,
      },
    });

    return AccountActivationTokenPersistenceMapper.toDomain(record);
  }

  async deleteExpiredTokens(now: Date): Promise<number> {
    const result = await this.prisma.accountActivationToken.updateMany({
      where: {
        expiresAt: { lt: now },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
      },
    });

    return result.count;
  }

  async getTokenByJti(jti: string): Promise<AccountActivationToken | null> {
    const record = await this.prisma.accountActivationToken.findFirst({
      where: { jti, deletedAt: null },
    });

    return record
      ? AccountActivationTokenPersistenceMapper.toDomain(record)
      : null;
  }

  async consumeToken(
    token: AccountActivationToken,
  ): Promise<AccountActivationToken> {
    const record = await this.prisma.accountActivationToken.update({
      where: { id: token.id },
      data: {
        updatedAt: token.updatedAt,
        deletedAt: token.deletedAt,
      },
    });

    return AccountActivationTokenPersistenceMapper.toDomain(record);
  }

  async getValidTokenByUserId(
    userId: string,
    now: Date,
  ): Promise<AccountActivationToken | null> {
    const record = await this.prisma.accountActivationToken.findFirst({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { gt: now },
      },
    });

    return record
      ? AccountActivationTokenPersistenceMapper.toDomain(record)
      : null;
  }
}
