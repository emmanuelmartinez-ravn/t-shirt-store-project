import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Role } from '../../domain/models/role';
import { RoleRepository } from '../../infrastructure/repositories/role.repository';

@Injectable()
export class GetAllRolesUseCase {
  private readonly logger: Logger = new Logger(GetAllRolesUseCase.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(): Promise<Role[]> {
    try {
      const roles = await this.roleRepository.getAllRoles();
      this.logger.log(`Retrieved ${roles.length} roles`);
      return roles;
    } catch (error) {
      this.logger.error('Failed to retrieve roles', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
