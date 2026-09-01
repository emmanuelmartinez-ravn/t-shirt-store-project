import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

@Injectable()
export class ToggleUserDisabledUseCase {
  private readonly logger: Logger = new Logger(ToggleUserDisabledUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(id);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(id);
      }

      const updatedUser = User.setDisabled(user, !user.disabled);
      const persistedUser = await this.userRepository.setDisabled(updatedUser);
      this.logger.log(
        `Toggled disabled status for user ${persistedUser.email} to ${persistedUser.disabled}`,
      );
      return persistedUser;
    } catch (error) {
      this.logger.error(
        `Failed to toggle disabled status for user ${id}`,
        error,
      );

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
