import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { PasswordResetToken } from '../../domain/models/password-reset-token';
import { PasswordResetTokenPersistenceMapper } from '../mappers/password-reset-token-persistence.mapper';
import { PasswordResetTokenRepository } from './password-reset-token.repository';

@Injectable()
export class PrismaPasswordResetTokenRepository extends PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createToken(token: PasswordResetToken): Promise<PasswordResetToken> {
    const record = await this.prisma.passwordResetToken.create({
      data: {
        id: token.id,
        jti: token.jti,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        userId: token.userId,
      },
    });

    return PasswordResetTokenPersistenceMapper.toDomain(record);
  }

  async getTokenByJti(jti: string): Promise<PasswordResetToken | null> {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { jti, deletedAt: null },
    });

    return record ? PasswordResetTokenPersistenceMapper.toDomain(record) : null;
  }

  async consumeToken(token: PasswordResetToken): Promise<PasswordResetToken> {
    const record = await this.prisma.passwordResetToken.update({
      where: { id: token.id },
      data: {
        updatedAt: token.updatedAt,
        deletedAt: token.deletedAt,
      },
    });

    return PasswordResetTokenPersistenceMapper.toDomain(record);
  }
}
