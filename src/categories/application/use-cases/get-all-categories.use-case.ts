import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Category } from '../../domain/models/category';
import { CategoryRepository } from '../../infrastructure/repositories/category.repository';

@Injectable()
export class GetAllCategoriesUseCase {
  private readonly logger: Logger = new Logger(GetAllCategoriesUseCase.name);

  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    try {
      const categories = await this.categoryRepository.getAllCategories();
      this.logger.log(`Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      this.logger.error('Failed to retrieve categories', error);
      throw new InternalServerErrorException({
        error: 'Internal Server Error',
        details: [],
      });
    }
  }
}
