export class ProductImageTooLargeError extends Error {
  constructor(
    readonly fileName: string,
    readonly size: number,
    readonly maxSize: number,
  ) {
    super(
      `Image "${fileName}" size ${size} bytes exceeds the ${maxSize} bytes limit`,
    );
    this.name = 'ProductImageTooLargeError';
  }
}
