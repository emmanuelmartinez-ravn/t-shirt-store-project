import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { User } from '../../../auth/domain/models/user';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { getSignedUrlTtlSeconds } from '../../../storage/config/signed-url-ttl';
import { UnreadableImageError } from '../../../storage/errors/unreadable-image';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ImageProcessorService } from '../../../storage/services/image-processor.service';
import { ImageDimensionsTooLargeError } from '../../domain/errors/image-dimensions-too-large';
import { ImageDimensionsTooSmallError } from '../../domain/errors/image-dimensions-too-small';
import { ImageRequiredError } from '../../domain/errors/image-required';
import { ImageTooLargeError } from '../../domain/errors/image-too-large';
import { InvalidImageAspectRatioError } from '../../domain/errors/invalid-image-aspect-ratio';
import { UnsupportedImageFormatError } from '../../domain/errors/unsupported-image-format';
import { UserDisabledError } from '../../domain/errors/user-disabled';
import { UserNotFoundError } from '../../domain/errors/user-not-found';
import {
  AVATAR_ACCEPTED_FORMATS,
  AVATAR_CONTENT_TYPE,
  AVATAR_MAX_DIMENSION,
  AVATAR_MAX_FILE_SIZE_BYTES,
  AVATAR_MIN_DIMENSION,
  AVATAR_OUTPUT_SIZE,
  IMAGE_TOO_LARGE_MESSAGE,
} from '../config/avatar-constraints';

@Injectable()
export class UpdateAvatarUseCase {
  private readonly logger: Logger = new Logger(UpdateAvatarUseCase.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  async execute(
    userId: string,
    image: { buffer: Buffer; size: number } | undefined,
  ): Promise<{ avatarUrl: string; expiresIn: number }> {
    try {
      const user = await this.userRepository.getUserById(userId);

      if (!user || user.deletedAt) {
        throw new UserNotFoundError(userId);
      }

      if (user.disabled) {
        throw new UserDisabledError(userId);
      }

      if (!image) {
        throw new ImageRequiredError();
      }

      if (image.size > AVATAR_MAX_FILE_SIZE_BYTES) {
        throw new ImageTooLargeError(image.size, AVATAR_MAX_FILE_SIZE_BYTES);
      }

      await this.validateImage(image.buffer);

      const resized = await this.imageProcessorService.resizeToJpeg(
        image.buffer,
        AVATAR_OUTPUT_SIZE,
      );
      const avatarKey = `avatars/${user.id}/${randomUUID()}.jpg`;

      await this.fileStorageService.upload({
        key: avatarKey,
        body: resized,
        contentType: AVATAR_CONTENT_TYPE,
      });

      const persistedUser = await this.persistAvatar(user, avatarKey);

      if (user.avatar) {
        await this.deletePreviousAvatar(user.avatar);
      }

      const avatarUrl = await this.fileStorageService.getSignedUrl(avatarKey);

      this.logger.log(`Updated avatar for user ${persistedUser.email}`);
      return { avatarUrl, expiresIn: getSignedUrlTtlSeconds() };
    } catch (error) {
      this.logger.error(`Failed to update avatar for user ${userId}`, error);

      if (error instanceof UserNotFoundError) {
        throw new NotFoundException({ error: 'User not found', details: [] });
      }

      if (error instanceof UserDisabledError) {
        throw new ForbiddenException({
          error: 'User is disabled',
          details: [],
        });
      }

      if (error instanceof ImageRequiredError) {
        throw new BadRequestException({
          error: 'Image file is required',
          details: [],
        });
      }

      if (error instanceof ImageTooLargeError) {
        throw new PayloadTooLargeException({
          error: IMAGE_TOO_LARGE_MESSAGE,
          details: [],
        });
      }

      if (
        error instanceof UnsupportedImageFormatError ||
        error instanceof UnreadableImageError
      ) {
        throw new UnsupportedMediaTypeException({
          error: 'Unsupported image format',
          details: ['Accepted formats: png, jpg, jpeg'],
        });
      }

      if (error instanceof InvalidImageAspectRatioError) {
        throw new BadRequestException({
          error: 'Image must have a 1:1 aspect ratio',
          details: [`Received ${error.width}x${error.height}`],
        });
      }

      if (error instanceof ImageDimensionsTooLargeError) {
        throw new BadRequestException({
          error: `Image dimensions must not exceed ${error.maxDimension}x${error.maxDimension}`,
          details: [`Received ${error.width}x${error.height}`],
        });
      }

      if (error instanceof ImageDimensionsTooSmallError) {
        throw new BadRequestException({
          error: `Image dimensions must be at least ${error.minDimension}x${error.minDimension}`,
          details: [`Received ${error.width}x${error.height}`],
        });
      }

      throw new InternalServerErrorException({
        error: 'Failed to update avatar',
        details: [],
      });
    }
  }

  private async validateImage(buffer: Buffer): Promise<void> {
    const { format, width, height } =
      await this.imageProcessorService.getMetadata(buffer);

    if (
      !format ||
      !AVATAR_ACCEPTED_FORMATS.includes(format) ||
      width === undefined ||
      height === undefined
    ) {
      throw new UnsupportedImageFormatError(format);
    }

    if (width !== height) {
      throw new InvalidImageAspectRatioError(width, height);
    }

    if (width > AVATAR_MAX_DIMENSION) {
      throw new ImageDimensionsTooLargeError(
        width,
        height,
        AVATAR_MAX_DIMENSION,
      );
    }

    if (width < AVATAR_MIN_DIMENSION) {
      throw new ImageDimensionsTooSmallError(
        width,
        height,
        AVATAR_MIN_DIMENSION,
      );
    }
  }

  private async persistAvatar(user: User, avatarKey: string): Promise<User> {
    try {
      return await this.userRepository.updateAvatar(
        User.changeAvatar(user, avatarKey),
      );
    } catch (error) {
      await this.deleteUploadedAvatar(avatarKey);
      throw error;
    }
  }

  private async deleteUploadedAvatar(avatarKey: string): Promise<void> {
    try {
      await this.fileStorageService.delete(avatarKey);
    } catch (cleanupError) {
      this.logger.warn(
        `Failed to clean up uploaded avatar ${avatarKey}`,
        cleanupError,
      );
    }
  }

  private async deletePreviousAvatar(previousKey: string): Promise<void> {
    try {
      await this.fileStorageService.delete(previousKey);
    } catch (error) {
      this.logger.warn(
        `Failed to delete previous avatar ${previousKey}`,
        error,
      );
    }
  }
}
