import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { RoleAlreadyExistsError } from '../../domain/errors/role-already-exists';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';

@Injectable()
export class CreateRoleUseCase {
  private readonly logger: Logger = new Logger(CreateRoleUseCase.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(name: string): Promise<Role> {
    try {
      const role = Role.create({ name });
      const createdRole = await this.roleRepository.createRole(role);
      this.logger.log(`Created role ${createdRole.name}`);
      return createdRole;
    } catch (error) {
      this.logger.error(`Failed to create role ${name}`, error);

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
