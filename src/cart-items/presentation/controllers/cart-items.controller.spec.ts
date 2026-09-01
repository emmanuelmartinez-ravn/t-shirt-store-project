import { Request } from 'express';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { AddCartItemUseCase } from '../../application/use-cases/add-cart-item.use-case';
import { GetAllCartItemsUseCase } from '../../application/use-cases/get-all-cart-items.use-case';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemResponseMapper } from '../mappers/cart-item-response.mapper';
import { CartItemsController } from './cart-items.controller';

describe('CartItemsController', () => {
  let controller: CartItemsController;
  let addCartItemUseCase: jest.Mocked<AddCartItemUseCase>;
  let getAllCartItemsUseCase: jest.Mocked<GetAllCartItemsUseCase>;

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
    getAllCartItemsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllCartItemsUseCase>;

    controller = new CartItemsController(
      addCartItemUseCase,
      getAllCartItemsUseCase,
    );
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

  describe('getAllCartItems', () => {
    it('delegates to the use case with the authenticated user id and the query params, and returns the mapped paginated response', async () => {
      getAllCartItemsUseCase.execute.mockResolvedValue({
        items: [cartItem],
        total: 1,
      });

      const result = await controller.getAllCartItems(req, {
        page: 1,
        limit: 20,
      });

      expect(getAllCartItemsUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-id',
        page: 1,
        limit: 20,
      });
      expect(result).toEqual({
        data: [CartItemResponseMapper.toResponse(cartItem)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });
});
