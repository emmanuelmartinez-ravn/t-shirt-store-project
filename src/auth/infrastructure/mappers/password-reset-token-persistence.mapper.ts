import { PasswordResetTokenModel } from '../../../../generated/prisma/models';
import { PasswordResetToken } from '../../domain/models/password-reset-token';

export class PasswordResetTokenPersistenceMapper {
  static toDomain(record: PasswordResetTokenModel): PasswordResetToken {
    return new PasswordResetToken({
      id: record.id,
      jti: record.jti,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      userId: record.userId,
    });
  }
}
