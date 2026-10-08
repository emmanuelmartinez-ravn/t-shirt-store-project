export class ProductImagesRequiredError extends Error {
  constructor() {
    super('At least one image file is required');
    this.name = 'ProductImagesRequiredError';
  }
}
