import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { UserNotDeletedError } from '../../domain/errors/user-not-deleted';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

@Injectable()
export class AnonymizeUserUseCase {
  private readonly logger: Logger = new Logger(AnonymizeUserUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(id);

      if (!user) {
        throw new UserNotFoundError(id);
      }

      if (!user.deletedAt) {
        throw new UserNotDeletedError(id);
      }

      const anonymizedUser = User.anonymize(user);
      const persistedUser =
        await this.userRepository.anonymizeUser(anonymizedUser);
      this.logger.log(`Anonymized user ${persistedUser.id}`);
      return persistedUser;
    } catch (error) {
      this.logger.error(`Failed to anonymize user ${id}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserNotDeletedError) {
        throw new ConflictException({
          error: 'User must be deleted before it can be anonymized',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
