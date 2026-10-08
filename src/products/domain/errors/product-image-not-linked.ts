export class ProductImageNotLinkedError extends Error {
  constructor(id: string) {
    super(`Product image "${id}" is not linked to a variant`);
    this.name = 'ProductImageNotLinkedError';
  }
}
