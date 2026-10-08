import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Options } from 'multer';
import { Observable } from 'rxjs';
import {
  PRODUCT_IMAGE_LIMIT_MESSAGE,
  PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES,
  PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
  PRODUCT_MAX_IMAGES,
} from '../../application/config/product-image-constraints';

export const PRODUCT_IMAGES_FIELD = 'images';

// Messages Nest's multer error transform produces when more than maxCount
// files arrive in the field (multer's LIMIT_UNEXPECTED_FILE, suffixed with the
// field name) or when a files limit is hit (LIMIT_FILE_COUNT).
const TOO_MANY_FILES_MESSAGES = [
  `Unexpected field - ${PRODUCT_IMAGES_FIELD}`,
  'Too many files',
];

const productImagesUploadOptions: Options = {
  limits: { fileSize: PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES },
};

const BaseProductImagesInterceptor = FilesInterceptor(
  PRODUCT_IMAGES_FIELD,
  PRODUCT_MAX_IMAGES,
  productImagesUploadOptions,
);

/**
 * Parses up to 10 files from the `images` multipart field into memory and
 * replaces multer's generic "File too large" / too-many-files errors with the
 * API's `{ error, details }` payloads.
 */
export class ProductImagesInterceptor extends BaseProductImagesInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      return await super.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeException({
          error: PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
          details: [],
        });
      }
      if (
        error instanceof BadRequestException &&
        TOO_MANY_FILES_MESSAGES.includes(error.message)
      ) {
        throw new BadRequestException({
          error: PRODUCT_IMAGE_LIMIT_MESSAGE,
          details: [`Received more than ${PRODUCT_MAX_IMAGES} files`],
        });
      }
      throw error;
    }
  }
}
