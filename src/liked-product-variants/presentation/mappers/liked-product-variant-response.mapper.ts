import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { LikedProductVariantResponseDto } from '../dto/liked-product-variant-response';

export class LikedProductVariantResponseMapper {
  static toResponse(
    likedProductVariant: LikedProductVariant,
  ): LikedProductVariantResponseDto {
    return {
      id: likedProductVariant.id,
      userId: likedProductVariant.userId,
      productVariantId: likedProductVariant.productVariantId,
      createdAt: likedProductVariant.createdAt,
    };
  }
}
