export class ImageTooLargeError extends Error {
  constructor(
    readonly size: number,
    readonly maxSize: number,
  ) {
    super(`Image size ${size} bytes exceeds the ${maxSize} bytes limit`);
    this.name = 'ImageTooLargeError';
  }
}
