export class ProductVariantAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Product variant "${id}" is already deleted`);
    this.name = 'ProductVariantAlreadyDeletedError';
  }
}
