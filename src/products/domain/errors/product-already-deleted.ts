export class ProductAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Product "${id}" is already deleted`);
    this.name = 'ProductAlreadyDeletedError';
  }
}
