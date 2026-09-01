import { PrismaService } from '../../../prisma/services/prisma.service';
import { CartItem } from '../../domain/models/cart-item';
import { PrismaCartItemRepository } from './prisma-cart-item.repository';

describe('PrismaCartItemRepository', () => {
  let repository: PrismaCartItemRepository;
  let prisma: {
    cartItem: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
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
        findMany: jest.fn(),
        count: jest.fn(),
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

  describe('getAllCartItems', () => {
    beforeEach(() => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: cartItem.id,
          quantity: cartItem.quantity,
          createdAt: cartItem.createdAt,
          updatedAt: cartItem.updatedAt,
          deletedAt: null,
          cartId: cartItem.cartId,
          productVariantId: cartItem.productVariantId,
        },
      ]);
      prisma.cartItem.count.mockResolvedValue(1);
    });

    it('returns the live cart items mapped to domain entities alongside the total count', async () => {
      const result = await repository.getAllCartItems({
        userId: 'user-id',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ items: [cartItem], total: 1 });
    });

    it('filters by the cart relation, not a direct userId field, since CartItem has none', async () => {
      await repository.getAllCartItems({
        userId: 'user-id',
        page: 1,
        limit: 20,
      });

      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          cart: { userId: 'user-id', deletedAt: null },
        },
        skip: 0,
        take: 20,
      });
      expect(prisma.cartItem.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          cart: { userId: 'user-id', deletedAt: null },
        },
      });
    });

    it('skips zero records on the first page', async () => {
      await repository.getAllCartItems({
        userId: 'user-id',
        page: 1,
        limit: 20,
      });

      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          cart: { userId: 'user-id', deletedAt: null },
        },
        skip: 0,
        take: 20,
      });
    });

    it('skips the correct number of records on a later page', async () => {
      await repository.getAllCartItems({
        userId: 'user-id',
        page: 2,
        limit: 10,
      });

      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          cart: { userId: 'user-id', deletedAt: null },
        },
        skip: 10,
        take: 10,
      });
    });
  });
});
