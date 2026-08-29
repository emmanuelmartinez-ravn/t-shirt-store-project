import { CategoryModel } from '../../../../generated/prisma/models';
import { Category } from '../../domain/models/category';

export class CategoriesPersistenceMapper {
  static toDomain(record: CategoryModel): Category {
    return new Category({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
