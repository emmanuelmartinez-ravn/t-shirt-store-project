import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { RoleRepository } from '../../../roles/infrastructure/repositories/role.repository';
import { ManagerRoleNotFoundError } from '../../domain/errors/manager-role-not-found';
import { UserAlreadyManagerError } from '../../domain/errors/user-already-manager';
import { UserDisabledError } from '../../domain/errors/user-disabled';
import { UserNotClientError } from '../../domain/errors/user-not-client';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

const CLIENT_ROLE_NAME = 'client';
const MANAGER_ROLE_NAME = 'manager';

@Injectable()
export class PromoteUserToManagerUseCase {
  private readonly logger: Logger = new Logger(
    PromoteUserToManagerUseCase.name,
  );

  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async execute(id: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(id);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(id);
      }

      if (user.disabled) {
        throw new UserDisabledError(id);
      }

      const currentRole = await this.roleRepository.getRoleById(user.roleId);

      if (!currentRole) {
        throw new Error(`Role "${user.roleId}" not found for user ${user.id}`);
      }

      if (currentRole.name === MANAGER_ROLE_NAME) {
        throw new UserAlreadyManagerError(id);
      }

      if (currentRole.name !== CLIENT_ROLE_NAME) {
        throw new UserNotClientError(id);
      }

      const managerRole =
        await this.roleRepository.getRoleByName(MANAGER_ROLE_NAME);

      if (!managerRole) {
        throw new ManagerRoleNotFoundError(MANAGER_ROLE_NAME);
      }

      const promotedUser = User.promote(user, managerRole.id);
      const persistedUser = await this.userRepository.promoteUser(promotedUser);
      this.logger.log(`Promoted user ${persistedUser.email} to manager`);
      return persistedUser;
    } catch (error) {
      this.logger.error(`Failed to promote user ${id}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserDisabledError) {
        throw new ForbiddenException({
          error: 'User is disabled',
          details: [],
        });
      }

      if (error instanceof UserAlreadyManagerError) {
        throw new ConflictException({
          error: 'User is already a manager',
          details: [],
        });
      }

      if (error instanceof UserNotClientError) {
        throw new ConflictException({
          error: 'User must be a client to be promoted',
          details: [],
        });
      }

      if (error instanceof ManagerRoleNotFoundError) {
        throw new InternalServerErrorException({
          error: 'Manager role not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
