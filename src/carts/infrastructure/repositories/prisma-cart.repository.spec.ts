import { PrismaService } from '../../../prisma/services/prisma.service';
import { Cart } from '../../domain/models/cart';
import { PrismaCartRepository } from './prisma-cart.repository';

describe('PrismaCartRepository', () => {
  let repository: PrismaCartRepository;
  let prisma: {
    cart: {
      create: jest.Mock;
      findUnique: jest.Mock;
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
        findUnique: jest.fn(),
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

  describe('getCartByUserId', () => {
    it('returns the mapped domain entity when found', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: cart.id,
        userId: cart.userId,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
        deletedAt: null,
      });

      const result = await repository.getCartByUserId(cart.userId);

      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: cart.userId },
      });
      expect(result).toEqual(cart);
    });

    it('returns null when no cart is found for the user', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await repository.getCartByUserId('user-id');

      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      });
      expect(result).toBeNull();
    });
  });
});
