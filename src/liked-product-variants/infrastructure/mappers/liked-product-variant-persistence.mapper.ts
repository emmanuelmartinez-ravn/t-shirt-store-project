import { LikedProductVariantModel } from '../../../../generated/prisma/models';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';

export class LikedProductVariantPersistenceMapper {
  static toDomain(record: LikedProductVariantModel): LikedProductVariant {
    return LikedProductVariant.restore({
      id: record.id,
      userId: record.userId,
      productVariantId: record.productVariantId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
