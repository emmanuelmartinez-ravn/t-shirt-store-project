import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CategoryAlreadyExistsError } from '../../domain/errors/category-already-exists';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger: Logger = new Logger(CreateCategoryUseCase.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(name: string): Promise<Category> {
    try {
      const category = Category.create({ name });
      const createdCategory =
        await this.categoryRepository.createCategory(category);
      this.logger.log(`Created category ${createdCategory.name}`);
      return createdCategory;
    } catch (error) {
      this.logger.error(`Failed to create category ${name}`, error);

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
