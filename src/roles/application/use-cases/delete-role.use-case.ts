import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RoleAlreadyDeletedError } from '../../domain/errors/role-already-deleted';
import { RoleNotFoundError } from '../../domain/errors/role-not-found';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';

@Injectable()
export class DeleteRoleUseCase {
  private readonly logger: Logger = new Logger(DeleteRoleUseCase.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: string): Promise<Role> {
    try {
      const existingRole = await this.roleRepository.getRoleById(id);

      if (!existingRole) {
        throw new RoleNotFoundError(id);
      }

      if (existingRole.deletedAt) {
        throw new RoleAlreadyDeletedError(id);
      }

      const deletedRole = Role.delete(existingRole);
      const persistedRole = await this.roleRepository.deleteRole(deletedRole);
      this.logger.log(`Deleted role ${persistedRole.name}`);
      return persistedRole;
    } catch (error) {
      this.logger.error(`Failed to delete role ${id}`, error);

      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException({ error: 'Role not found', details: [] });
      }

      if (error instanceof RoleAlreadyDeletedError) {
        throw new GoneException({
          error: 'Role already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
