import { Category } from '../../domain/models/category';

export abstract class CategoryRepository {
  abstract createCategory(category: Category): Promise<Category>;
  abstract getAllCategories(): Promise<Category[]>;
  abstract updateCategory(category: Category): Promise<Category>;
  abstract deleteCategory(category: Category): Promise<Category>;
  abstract getCategoryById(id: string): Promise<Category | null>;
}
