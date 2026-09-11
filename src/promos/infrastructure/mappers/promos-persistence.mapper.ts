import { $Enums } from '../../../../generated/prisma/client';
import { PromoModel } from '../../../../generated/prisma/models';
import { Promo, PromoDiscountType } from '../../domain/models/promo';

export class PromosPersistenceMapper {
  static toDomain(record: PromoModel): Promo {
    return new Promo({
      id: record.id,
      code: record.code,
      type: this.toDomainType(record.type),
      value: record.value,
      expiration: record.expiration,
      remainUsages: record.remainUsages,
      minimumPurchaseAmount: record.minimumPurchaseAmount,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }

  static toPersistenceType(type: PromoDiscountType): $Enums.discount_type {
    return type === 'percentage'
      ? $Enums.discount_type.percentage
      : $Enums.discount_type.fixed;
  }

  private static toDomainType(type: $Enums.discount_type): PromoDiscountType {
    return type === $Enums.discount_type.percentage ? 'percentage' : 'fixed';
  }
}
