export class CategoryAlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Category "${id}" is already deleted`);
    this.name = 'CategoryAlreadyDeletedError';
  }
}
