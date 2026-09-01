import { Cart } from '../../domain/models/cart';

export abstract class CartRepository {
  abstract createCart(cart: Cart): Promise<Cart>;
  abstract getCartByUserId(userId: string): Promise<Cart | null>;
}
