import { CartItem } from '../../domain/models/cart-item';
import { CartItemResponseDto } from '../dto/cart-item-response';

export class CartItemResponseMapper {
  static toResponse(cartItem: CartItem): CartItemResponseDto {
    return {
      id: cartItem.id,
      quantity: cartItem.quantity,
      cartId: cartItem.cartId,
      productVariantId: cartItem.productVariantId,
      createdAt: cartItem.createdAt,
      updatedAt: cartItem.updatedAt,
      deletedAt: cartItem.deletedAt,
    };
  }
}
