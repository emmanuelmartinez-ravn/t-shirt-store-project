import { CartItem } from '../../domain/models/cart-item';

export abstract class CartItemRepository {
  abstract createCartItem(cartItem: CartItem): Promise<CartItem>;
}
