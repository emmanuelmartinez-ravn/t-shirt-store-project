export class ImageDimensionsTooLargeError extends Error {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly maxDimension: number,
  ) {
    super(
      `Image dimensions ${width}x${height} exceed ${maxDimension}x${maxDimension}`,
    );
    this.name = 'ImageDimensionsTooLargeError';
  }
}
