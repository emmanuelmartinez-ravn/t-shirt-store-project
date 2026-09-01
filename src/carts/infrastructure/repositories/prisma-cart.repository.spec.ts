import { PrismaService } from '../../../prisma/services/prisma.service';
import { Cart } from '../../domain/models/cart';
import { PrismaCartRepository } from './prisma-cart.repository';

describe('PrismaCartRepository', () => {
  let repository: PrismaCartRepository;
  let prisma: {
    cart: {
      create: jest.Mock;
    };
  };

  const cart = Cart.restore({
    id: 'cart-id',
    userId: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  beforeEach(() => {
    prisma = {
      cart: {
        create: jest.fn(),
      },
    };
    repository = new PrismaCartRepository(prisma as unknown as PrismaService);
  });

  it('is defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createCart', () => {
    it('persists the cart and returns the mapped domain entity', async () => {
      prisma.cart.create.mockResolvedValue({
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        deletedAt: null,
      });

      const result = await repository.createCart(cart);

      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: {
          id: cart.id,
          userId: cart.userId,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        },
      });
      expect(result).toEqual(cart);
    });
  });
});
