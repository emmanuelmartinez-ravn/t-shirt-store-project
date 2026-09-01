import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UserAlreadyDeletedError } from '../../domain/errors/user-already-deleted';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

@Injectable()
export class DeleteUserUseCase {
  private readonly logger: Logger = new Logger(DeleteUserUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(id);

      if (!user) {
        throw new UserNotFoundError(id);
      }

      if (user.deletedAt) {
        throw new UserAlreadyDeletedError(id);
      }

      const deletedUser = User.delete(user);
      const persistedUser = await this.userRepository.deleteUser(deletedUser);
      this.logger.log(`Deleted user ${persistedUser.email}`);
      return persistedUser;
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserAlreadyDeletedError) {
        throw new GoneException({
          error: 'User already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
