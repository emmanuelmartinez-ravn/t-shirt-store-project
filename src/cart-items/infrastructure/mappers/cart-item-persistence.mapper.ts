import { CartItemModel } from '../../../../generated/prisma/models';
import { CartItem } from '../../domain/models/cart-item';

export class CartItemPersistenceMapper {
  static toDomain(record: CartItemModel): CartItem {
    return CartItem.restore({
      id: record.id,
      quantity: record.quantity,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
      cartId: record.cartId,
      productVariantId: record.productVariantId,
    });
  }
}
