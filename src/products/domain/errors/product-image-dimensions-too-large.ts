export class ProductImageDimensionsTooLargeError extends Error {
  constructor(
    readonly fileName: string,
    readonly width: number,
    readonly height: number,
    readonly maxDimension: number,
  ) {
    super(
      `Image "${fileName}" dimensions ${width}x${height} exceed ${maxDimension}x${maxDimension}`,
    );
    this.name = 'ProductImageDimensionsTooLargeError';
  }
}
