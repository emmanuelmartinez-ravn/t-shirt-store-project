import { CartModel } from '../../../../generated/prisma/models';
import { Cart } from '../../domain/models/cart';

export class CartsPersistenceMapper {
  static toDomain(record: CartModel): Cart {
    return new Cart({
      id: record.id,
      userId: record.userId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
