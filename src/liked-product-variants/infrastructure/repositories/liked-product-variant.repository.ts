import { LikedProductVariant } from '../../domain/models/liked-product-variant';

export abstract class LikedProductVariantRepository {
  abstract like(
    likedProductVariant: LikedProductVariant,
  ): Promise<LikedProductVariant>;
  abstract unlike(userId: string, productVariantId: string): Promise<boolean>;
}
