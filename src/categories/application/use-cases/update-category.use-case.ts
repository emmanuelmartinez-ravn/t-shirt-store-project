import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger: Logger = new Logger(UpdateCategoryUseCase.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string, name: string): Promise<Category> {
    try {
      const existingCategory =
        await this.categoryRepository.getCategoryById(id);

      if (!existingCategory) {
        throw new CategoryNotFoundError(id);
      }

      const updatedCategory = Category.update(existingCategory, { name });
      const persistedCategory =
        await this.categoryRepository.updateCategory(updatedCategory);
      this.logger.log(`Updated category ${persistedCategory.name}`);
      return persistedCategory;
    } catch (error) {
      this.logger.error(`Failed to update category ${id}`, error);

      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException({
          error: 'Category not found',
          details: [],
        });
      }

      if (error instanceof CategoryAlreadyExistsError) {
        throw new ConflictException({
          error: 'Category already exists',
          details: ['name must be unique'],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
