import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemPersistenceMapper } from '../mappers/cart-item-persistence.mapper';
import { CartItemRepository } from './cart-item.repository';

@Injectable()
export class PrismaCartItemRepository extends CartItemRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createCartItem(cartItem: CartItem): Promise<CartItem> {
    const record = await this.prisma.cartItem.create({
      data: {
        id: cartItem.id,
        quantity: cartItem.quantity,
        createdAt: cartItem.createdAt,
        updatedAt: cartItem.updatedAt,
        cartId: cartItem.cartId,
        productVariantId: cartItem.productVariantId,
      },
    });

    return CartItemPersistenceMapper.toDomain(record);
  }
}
