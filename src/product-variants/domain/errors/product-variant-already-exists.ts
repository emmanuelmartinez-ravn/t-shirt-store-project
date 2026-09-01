export class ProductVariantAlreadyExistsError extends Error {
  constructor(sku: string) {
    super(`Product variant "${sku}" already exists`);
    this.name = 'ProductVariantAlreadyExistsError';
  }
}
