import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { UserNotFoundError } from '../../domain/errors/user-not-found';

@Injectable()
export class GetUserAvatarUseCase {
  private readonly logger: Logger = new Logger(GetUserAvatarUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(
    userId: string,
    defaultAvatarUrl: string,
  ): Promise<{
    avatarUrl: string;
    expiresIn: number | null;
    isDefault: boolean;
  }> {
    try {
      const user = await this.userRepository.getUserById(userId);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(userId);
      }

      if (!user.avatar) {
        return {
          avatarUrl: defaultAvatarUrl,
          expiresIn: null,
          isDefault: true,
        };
      }

      const avatarUrl = await this.fileStorageService.getSignedUrl(user.avatar);

      return {
        avatarUrl,
        expiresIn: getSignedUrlTtlSeconds(),
        isDefault: false,
      };
    } catch (error) {
      this.logger.error(`Failed to get avatar for user ${userId}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      throw new InternalServerErrorException({
        error: 'Failed to get avatar',
        details: [],
      });
    }
  }
}
