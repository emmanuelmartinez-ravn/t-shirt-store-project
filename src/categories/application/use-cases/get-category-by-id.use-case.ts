import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CategoryNotFoundError } from '../../domain/errors/category-not-found';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class GetCategoryByIdUseCase {
  private readonly logger: Logger = new Logger(GetCategoryByIdUseCase.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(id: string): Promise<Category> {
    try {
      const category = await this.categoryRepository.getCategoryById(id);

      if (!category) {
        throw new CategoryNotFoundError(id);
      }

      this.logger.log(`Retrieved category ${category.name}`);
      return category;
    } catch (error) {
      this.logger.error(`Failed to retrieve category ${id}`, error);

      if (error instanceof CategoryNotFoundError) {
        throw new NotFoundException({
          error: 'Category not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
