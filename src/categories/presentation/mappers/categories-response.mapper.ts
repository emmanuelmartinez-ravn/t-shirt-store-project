import { Category } from '../../domain/models/category';
import { CategoryResponseDto } from '../dto/category-response';

export class CategoriesResponseMapper {
  static toResponse(category: Category): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
    };
  }
}
