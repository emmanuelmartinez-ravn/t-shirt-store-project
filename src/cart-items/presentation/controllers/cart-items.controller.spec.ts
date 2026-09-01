import { Request } from 'express';
import { AddCartItemUseCase } from '../../application/use-cases/add-cart-item.use-case';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemResponseMapper } from '../mappers/cart-item-response.mapper';
import { CartItemsController } from './cart-items.controller';

describe('CartItemsController', () => {
  let controller: CartItemsController;
  let addCartItemUseCase: jest.Mocked<AddCartItemUseCase>;

  const cartItem = CartItem.restore({
    id: 'cart-item-id',
    cartId: 'cart-id',
    productVariantId: 'variant-id',
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  const req = {
    user: {
      sub: 'user-id',
      email: 'joe.doe@example.com',
      role: 'client',
      roleId: 'role-id',
    },
  } as unknown as Request;

  beforeEach(() => {
    addCartItemUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddCartItemUseCase>;

    controller = new CartItemsController(addCartItemUseCase);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addCartItem', () => {
    it('delegates to the use case with the authenticated user id and returns the mapped response', async () => {
      addCartItemUseCase.execute.mockResolvedValue(cartItem);

      const result = await controller.addCartItem(req, {
        productVariantId: 'variant-id',
        quantity: 2,
      });

      expect(addCartItemUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-id',
        productVariantId: 'variant-id',
        quantity: 2,
      });
      expect(result).toEqual(CartItemResponseMapper.toResponse(cartItem));
    });
  });
});
