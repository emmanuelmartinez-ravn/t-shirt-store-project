import { RoleModel } from '../../../../generated/prisma/models';
import { Role } from '../../domain/models/role';

export class RolesPersistenceMapper {
  static toDomain(record: RoleModel): Role {
    return new Role({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
