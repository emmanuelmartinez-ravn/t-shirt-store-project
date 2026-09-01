export class ProductVariantNotFoundError extends Error {
  constructor(id: string) {
    super(`Product variant "${id}" not found`);
    this.name = 'ProductVariantNotFoundError';
  }
}
