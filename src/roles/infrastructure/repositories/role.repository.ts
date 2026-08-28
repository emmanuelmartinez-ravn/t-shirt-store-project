import { Role } from '../../domain/models/role';

export abstract class RoleRepository {
  abstract createRole(role: Role): Promise<Role>;
  abstract getAllRoles(): Promise<Role[]>;
  abstract updateRole(role: Role): Promise<Role>;
  abstract deleteRole(role: Role): Promise<Role>;
  abstract getRoleByName(name: string): Promise<Role | null>;
  abstract getRoleById(id: string): Promise<Role | null>;
}
