export class VariantProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product "${productId}" not found`);
    this.name = 'VariantProductNotFoundError';
  }
}
