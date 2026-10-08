export class ImageRequiredError extends Error {
  constructor() {
    super('Image file is required');
    this.name = 'ImageRequiredError';
  }
}
