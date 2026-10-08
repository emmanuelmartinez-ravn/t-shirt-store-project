export class InvalidImageAspectRatioError extends Error {
  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    super(`Image must have a 1:1 aspect ratio, received ${width}x${height}`);
    this.name = 'InvalidImageAspectRatioError';
  }
}
