import { UserModel } from '../../../../generated/prisma/models';
import { User } from '../../domain/models/user';

export class UserPersistenceMapper {
  static toDomain(record: UserModel): User {
    return new User({
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.email,
      hashedPassword: record.hashedPassword,
      avatar: record.avatar,
      disabled: record.disabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      roleId: record.roleId,
    });
  }
}
