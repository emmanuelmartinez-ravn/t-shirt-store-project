import { ProductImageModel } from '../../../../generated/prisma/models';
import { ProductImage } from '../../domain/models/product-image';

export class ProductImagesPersistenceMapper {
  static toDomain(record: ProductImageModel): ProductImage {
    return ProductImage.restore({
      id: record.id,
      imagePath: record.imagePath,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      productId: record.productId,
      variantId: record.variantId,
    });
  }

  static toPersistence(image: ProductImage): ProductImageModel {
    return {
      id: image.id,
      imagePath: image.imagePath,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      deletedAt: image.deletedAt,
      productId: image.productId,
      variantId: image.variantId,
    };
  }
}
