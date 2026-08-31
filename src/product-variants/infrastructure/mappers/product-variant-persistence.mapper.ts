import { ProductVariantModel } from '../../../../generated/prisma/models';
import { ProductVariant } from '../../domain/models/product-variant';

export class ProductVariantPersistenceMapper {
  static toDomain(record: ProductVariantModel): ProductVariant {
    return new ProductVariant({
      id: record.id,
      sku: record.sku,
      price: record.price,
      stock: record.stock,
      disabled: record.disabled,
      attributes: record.attributes as Record<string, string>,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      productId: record.productId,
    });
  }
}
