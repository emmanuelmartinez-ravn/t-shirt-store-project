import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { IncorrectPasswordError } from '../../domain/errors/incorrect-password';
import { UserDisabledError } from '../../domain/errors/user-disabled';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UpdatePasswordUseCase {
  private readonly logger: Logger = new Logger(UpdatePasswordUseCase.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    userId: string,
    props: { oldPassword: string; newPassword: string },
  ): Promise<User> {
    try {
      const user = await this.userRepository.getUserById(userId);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(userId);
      }

      if (user.disabled) {
        throw new UserDisabledError(userId);
      }

      const oldPasswordMatches = await bcrypt.compare(
        props.oldPassword,
        user.hashedPassword,
      );

      if (!oldPasswordMatches) {
        throw new IncorrectPasswordError(userId);
      }

      const hashedPassword = await bcrypt.hash(
        props.newPassword,
        PASSWORD_SALT_ROUNDS,
      );
      const updatedUser = User.changePassword(user, hashedPassword);
      const persistedUser =
        await this.userRepository.updatePassword(updatedUser);

      this.logger.log(`Updated password for user ${persistedUser.email}`);
      return persistedUser;
    } catch (error) {
      this.logger.error(`Failed to update password for user ${userId}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserDisabledError) {
        throw new ForbiddenException({
          error: 'User is disabled',
          details: [],
        });
      }

      if (error instanceof IncorrectPasswordError) {
        throw new BadRequestException({
          error: 'Old password is incorrect',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
