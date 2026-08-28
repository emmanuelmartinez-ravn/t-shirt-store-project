import { RefreshTokenModel } from '../../../../generated/prisma/models';
import { RefreshToken } from '../../domain/models/refresh-token';

export class RefreshTokenPersistenceMapper {
  static toDomain(record: RefreshTokenModel): RefreshToken {
    return new RefreshToken({
      id: record.id,
      jti: record.jti,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      userId: record.userId,
    });
  }
}
