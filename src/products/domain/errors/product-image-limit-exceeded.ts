export class ProductImageLimitExceededError extends Error {
  constructor(
    readonly existingCount: number,
    readonly newCount: number,
    readonly maxImages: number,
  ) {
    super(
      `Product has ${existingCount} images, adding ${newCount} would exceed the limit of ${maxImages}`,
    );
    this.name = 'ProductImageLimitExceededError';
  }
}
