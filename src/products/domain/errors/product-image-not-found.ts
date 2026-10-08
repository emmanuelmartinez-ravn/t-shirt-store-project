export class ProductImageNotFoundError extends Error {
  constructor(id: string) {
    super(`Product image "${id}" not found`);
    this.name = 'ProductImageNotFoundError';
  }
}
