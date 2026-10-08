export class ImageDimensionsTooSmallError extends Error {
  constructor(
    readonly width: number,
    readonly height: number,
    readonly minDimension: number,
  ) {
    super(
      `Image dimensions ${width}x${height} are below ${minDimension}x${minDimension}`,
    );
    this.name = 'ImageDimensionsTooSmallError';
  }
}
