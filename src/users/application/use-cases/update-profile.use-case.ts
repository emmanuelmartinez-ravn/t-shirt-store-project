import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UserDisabledError } from '../../domain/errors/user-disabled';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger: Logger = new Logger(UpdateProfileUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    userId: string,
    props: { firstName: string; lastName: string },
  ): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(userId);
      }

      if (user.disabled) {
        throw new UserDisabledError(userId);
      }

      const updatedUser = User.updateProfile(user, props);
      const persistedUser =
        await this.userRepository.updateProfile(updatedUser);

      this.logger.log(`Updated profile for user ${persistedUser.email}`);
      return persistedUser;
    } catch (error) {
      this.logger.error(`Failed to update profile for user ${userId}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserDisabledError) {
        throw new ForbiddenException({
          error: 'User is disabled',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
