export const PRODUCT_MAX_IMAGES = 10;
export const PRODUCT_IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 1024;
export const PRODUCT_IMAGE_ACCEPTED_FORMATS = ['png', 'jpeg'] as const;
export type ProductImageFormat =
  (typeof PRODUCT_IMAGE_ACCEPTED_FORMATS)[number];
export const PRODUCT_IMAGE_EXTENSIONS: Record<ProductImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
};
export const PRODUCT_IMAGE_CONTENT_TYPES: Record<ProductImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
};
export const PRODUCT_IMAGE_TOO_LARGE_MESSAGE =
  'Each image must be 5 MB or smaller';
export const PRODUCT_IMAGE_LIMIT_MESSAGE = `A product can have at most ${PRODUCT_MAX_IMAGES} images`;
