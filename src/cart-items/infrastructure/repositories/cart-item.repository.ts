import { PaginatedResult } from '../../../common/pagination/paginated-result';
import { CartItem } from '../../domain/models/cart-item';

export abstract class CartItemRepository {
  abstract createCartItem(cartItem: CartItem): Promise<CartItem>;
  abstract getAllCartItems(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CartItem>>;
}
