export class CategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Category "${id}" not found`);
    this.name = 'CategoryNotFoundError';
  }
}
