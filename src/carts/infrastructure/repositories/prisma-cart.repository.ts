import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/services/prisma.service';
import { Cart } from '../../domain/models/cart';
import { CartsPersistenceMapper } from '../mappers/carts-persistence.mapper';
import { CartRepository } from './cart.repository';

@Injectable()
export class PrismaCartRepository extends CartRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createCart(cart: Cart): Promise<Cart> {
    const record = await this.prisma.cart.create({
      data: {
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      },
    });

    return CartsPersistenceMapper.toDomain(record);
  }
}
