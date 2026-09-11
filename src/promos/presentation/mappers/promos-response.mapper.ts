import { Promo } from '../../domain/models/promo';
import { PromoResponseDto } from '../dto/promo-response';

export class PromosResponseMapper {
  static toResponse(promo: Promo): PromoResponseDto {
    return {
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      expiration: promo.expiration,
      remainUsages: promo.remainUsages,
      minimumPurchaseAmount: promo.minimumPurchaseAmount,
      createdAt: promo.createdAt,
      updatedAt: promo.updatedAt,
      deletedAt: promo.deletedAt,
    };
  }
}
