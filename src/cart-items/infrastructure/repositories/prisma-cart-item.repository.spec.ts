import { PrismaService } from '../../../prisma/services/prisma.service';
import { CartItem } from '../../domain/models/cart-item';
import { PrismaCartItemRepository } from './prisma-cart-item.repository';

describe('PrismaCartItemRepository', () => {
  let repository: PrismaCartItemRepository;
  let prisma: {
    cartItem: {
      create: jest.Mock;
    };
  };

  const cartItem = CartItem.restore({
    id: 'cart-item-id',
    cartId: 'cart-id',
    productVariantId: 'variant-id',
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    prisma = {
      cartItem: {
        create: jest.fn(),
      },
    };
    repository = new PrismaCartItemRepository(
      prisma as unknown as PrismaService,
    );
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createCartItem', () => {
    it('persists the cart item and returns the mapped domain entity', async () => {
      prisma.cartItem.create.mockResolvedValue({
        id: cartItem.id,
        quantity: cartItem.quantity,
        createdAt: cartItem.createdAt,
        updatedAt: cartItem.updatedAt,
        deletedAt: null,
        cartId: cartItem.cartId,
        productVariantId: cartItem.productVariantId,
      });

      const result = await repository.createCartItem(cartItem);

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: {
          id: cartItem.id,
          quantity: cartItem.quantity,
          createdAt: cartItem.createdAt,
          updatedAt: cartItem.updatedAt,
          cartId: cartItem.cartId,
          productVariantId: cartItem.productVariantId,
        },
      });
      expect(result).toEqual(cartItem);
    });
  });
});
