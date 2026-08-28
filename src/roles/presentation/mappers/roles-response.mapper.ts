import { Role } from '../../domain/models/role';
import { RoleResponseDto } from '../dto/role-response';

export class RolesResponseMapper {
  static toResponse(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
    };
  }
}
