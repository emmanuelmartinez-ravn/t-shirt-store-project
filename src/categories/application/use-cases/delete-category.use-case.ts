import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CategoryAlreadyDeletedError } from '../../domain/errors/category-already-deleted';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class DeleteCategoryUseCase {
  private readonly logger: Logger = new Logger(DeleteCategoryUseCase.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string): Promise<Category> {
    try {
      const existingCategory =
        await this.categoryRepository.getCategoryById(id);

      if (!existingCategory) {
        throw new CategoryNotFoundError(id);
      }

      if (existingCategory.deletedAt) {
        throw new CategoryAlreadyDeletedError(id);
      }

      const deletedCategory = Category.delete(existingCategory);
      const persistedCategory =
        await this.categoryRepository.deleteCategory(deletedCategory);
      this.logger.log(`Deleted category ${persistedCategory.name}`);
      return persistedCategory;
    } catch (error) {
      this.logger.error(`Failed to delete category ${id}`, error);

      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException({
          error: 'Category not found',
          details: [],
        });
      }

      if (error instanceof CategoryAlreadyDeletedError) {
        throw new GoneException({
          error: 'Category already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
