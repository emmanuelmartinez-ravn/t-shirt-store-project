import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedResult } from '../../../common/pagination/paginated-result';
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

  async getAllCartItems(params: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CartItem>> {
    const { userId, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CartItemWhereInput = {
      deletedAt: null,
      cart: { userId, deletedAt: null },
    };

    const [records, total] = await Promise.all([
      this.prisma.cartItem.findMany({ where, skip, take: limit }),
      this.prisma.cartItem.count({ where }),
    ]);

    return {
      items: records.map((record) =>
        CartItemPersistenceMapper.toDomain(record),
      ),
      total,
    };
  }
}
