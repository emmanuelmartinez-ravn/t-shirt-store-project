import { InternalServerErrorException } from '@nestjs/common';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemRepository } from '../../infrastructure/repositories/cart-item.repository';
import { GetAllCartItemsUseCase } from './get-all-cart-items.use-case';

describe('GetAllCartItemsUseCase', () => {
  let useCase: GetAllCartItemsUseCase;
  let cartItemRepository: jest.Mocked<CartItemRepository>;

  const cartItems = [
    CartItem.restore({
      id: 'cart-item-id',
      cartId: 'cart-id',
      productVariantId: 'variant-id',
      quantity: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }),
  ];

  beforeEach(() => {
    cartItemRepository = {
      createCartItem: jest.fn(),
      getAllCartItems: jest.fn(),
    };

    useCase = new GetAllCartItemsUseCase(cartItemRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('returns the paginated cart items', async () => {
      cartItemRepository.getAllCartItems.mockResolvedValue({
        items: cartItems,
        total: cartItems.length,
      });

      const result = await useCase.execute({
        userId: 'user-id',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ items: cartItems, total: cartItems.length });
    });

    it('passes the params through unchanged to the repository', async () => {
      cartItemRepository.getAllCartItems.mockResolvedValue({
        items: cartItems,
        total: cartItems.length,
      });
      const params = { userId: 'user-id', page: 2, limit: 10 };

      await useCase.execute(params);

      expect(cartItemRepository.getAllCartItems).toHaveBeenCalledWith(params);
    });

    it('translates unexpected errors into an InternalServerErrorException', async () => {
      cartItemRepository.getAllCartItems.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({ userId: 'user-id', page: 1, limit: 20 }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
