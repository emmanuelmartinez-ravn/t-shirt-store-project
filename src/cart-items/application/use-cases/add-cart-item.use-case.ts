import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CartRepository } from '../../../carts/infrastructure/repositories/cart.repository';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { CartNotFoundError } from '../../domain/errors/cart-not-found';
import { ProductVariantNotFoundError } from '../../domain/errors/product-variant-not-found';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemRepository } from '../../infrastructure/repositories/cart-item.repository';

@Injectable()
export class AddCartItemUseCase {
  private readonly logger: Logger = new Logger(AddCartItemUseCase.name);

  constructor(
    private readonly cartItemRepository: CartItemRepository,
    private readonly cartRepository: CartRepository,
    private readonly productVariantRepository: ProductVariantRepository,
  ) {}

  async execute(props: {
    userId: string;
    productVariantId: string;
    quantity: number;
  }): Promise<CartItem> {
    try {
      const variant = await this.productVariantRepository.getProductVariantById(
        props.productVariantId,
      );

      if (!variant || variant.deletedAt) {
        throw new ProductVariantNotFoundError(props.productVariantId);
      }

      const cart = await this.cartRepository.getCartByUserId(props.userId);

      if (!cart || cart.deletedAt) {
        throw new CartNotFoundError(props.userId);
      }

      const cartItem = CartItem.create({
        cartId: cart.id,
        productVariantId: props.productVariantId,
        quantity: props.quantity,
      });
      const created = await this.cartItemRepository.createCartItem(cartItem);

      this.logger.log(
        `Added product variant ${props.productVariantId} to cart ${cart.id}`,
      );
      return created;
    } catch (error) {
      this.logger.error(
        `Failed to add product variant ${props.productVariantId} to cart for user ${props.userId}`,
        error,
      );

      if (error instanceof ProductVariantNotFoundError) {
        throw new NotFoundException({
          error: 'Product variant not found',
          details: [],
        });
      }

      if (error instanceof CartNotFoundError) {
        throw new NotFoundException({
          error: 'Cart not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
