import {
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Options } from 'multer';
import { Observable } from 'rxjs';
import {
  AVATAR_MAX_FILE_SIZE_BYTES,
  IMAGE_TOO_LARGE_MESSAGE,
} from '../../application/config/avatar-constraints';

export const AVATAR_IMAGE_FIELD = 'image';

const avatarUploadOptions: Options = {
  limits: { fileSize: AVATAR_MAX_FILE_SIZE_BYTES },
};

const BaseAvatarImageInterceptor = FileInterceptor(
  AVATAR_IMAGE_FIELD,
  avatarUploadOptions,
);

/**
 * Parses the `image` multipart field into memory and replaces multer's generic
 * "File too large" error with the API's `{ error, details }` 413 payload.
 */
export class AvatarImageInterceptor extends BaseAvatarImageInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return await super.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException({
          error: IMAGE_TOO_LARGE_MESSAGE,
          details: [],
        });
      }
      throw error;
    }
  }
}
