import { ProductModel } from '../../../../generated/prisma/models';
import { Product } from '../../domain/models/product';

export class ProductsPersistenceMapper {
  static toDomain(record: ProductModel): Product {
    return new Product({
      id: record.id,
      name: record.name,
      code: record.code,
      description: record.description,
      disabled: record.disabled,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      categoryId: record.categoryId,
    });
  }
}
