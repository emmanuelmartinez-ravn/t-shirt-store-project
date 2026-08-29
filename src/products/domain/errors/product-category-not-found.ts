export class ProductCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Category "${categoryId}" not found`);
    this.name = 'ProductCategoryNotFoundError';
  }
}
