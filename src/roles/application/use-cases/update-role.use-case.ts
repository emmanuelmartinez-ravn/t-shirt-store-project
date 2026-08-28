import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { RoleNotFoundError } from '../../domain/errors/role-not-found';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';

@Injectable()
export class UpdateRoleUseCase {
  private readonly logger: Logger = new Logger(UpdateRoleUseCase.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: string, name: string): Promise<Role> {
    try {
      const existingRole = await this.roleRepository.getRoleById(id);

      if (!existingRole) {
        throw new RoleNotFoundError(id);
      }

      const updatedRole = Role.update(existingRole, { name });
      const persistedRole = await this.roleRepository.updateRole(updatedRole);
      this.logger.log(`Updated role ${persistedRole.name}`);
      return persistedRole;
    } catch (error) {
      this.logger.error(`Failed to update role ${id}`, error);

      if (error instanceof RoleNotFoundError) {
        throw new NotFoundException({ error: 'Role not found', details: [] });
      }

      if (error instanceof RoleAlreadyExistsError) {
        throw new ConflictException({
          error: 'Role already exists',
          details: ['name must be unique'],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
