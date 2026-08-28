import { AccountActivationTokenModel } from '../../../../generated/prisma/models';
import { AccountActivationToken } from '../../domain/models/account-activation-token';

export class AccountActivationTokenPersistenceMapper {
  static toDomain(record: AccountActivationTokenModel): AccountActivationToken {
    return new AccountActivationToken({
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
