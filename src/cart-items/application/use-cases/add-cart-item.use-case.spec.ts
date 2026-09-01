import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Cart } from '../../../carts/domain/models/cart';
import { CartRepository } from '../../../carts/infrastructure/repositories/cart.repository';
import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { CartItem } from '../../domain/models/cart-item';
import { CartItemRepository } from '../../infrastructure/repositories/cart-item.repository';
import { AddCartItemUseCase } from './add-cart-item.use-case';

describe('AddCartItemUseCase', () => {
  let useCase: AddCartItemUseCase;
  let cartItemRepository: jest.Mocked<CartItemRepository>;
  let cartRepository: jest.Mocked<CartRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;

  const variant = ProductVariant.restore({
    id: 'variant-id',
    sku: 'TS-000001-MED-BLU',
    price: 19.99,
    stock: 100,
    disabled: false,
    attributes: { size: 'medium', color: 'blue' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    productId: 'product-id',
  });

  const cart = Cart.restore({
    id: 'cart-id',
    userId: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

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
    cartItemRepository = {
      createCartItem: jest.fn(),
    };
    cartRepository = {
      createCart: jest.fn(),
      getCartByUserId: jest.fn(),
    };
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getAllProductVariants: jest.fn(),
      getProductVariantById: jest.fn(),
      updateProductVariant: jest.fn(),
      deleteProductVariant: jest.fn(),
    };

    useCase = new AddCartItemUseCase(
      cartItemRepository,
      cartRepository,
      productVariantRepository,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('adds the product variant to the user cart and returns the persisted cart item', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      cartRepository.getCartByUserId.mockResolvedValue(cart);
      cartItemRepository.createCartItem.mockResolvedValue(cartItem);

      const result = await useCase.execute({
        userId: 'user-id',
        productVariantId: 'variant-id',
        quantity: 2,
      });

      expect(cartItemRepository.createCartItem).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 'cart-id',
          productVariantId: 'variant-id',
          quantity: 2,
        }),
      );
      expect(result).toBe(cartItem);
    });

    it('translates a missing product variant into a NotFoundException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
          quantity: 1,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(cartRepository.getCartByUserId).not.toHaveBeenCalled();
      expect(cartItemRepository.createCartItem).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product variant into a NotFoundException', async () => {
      const deletedVariant = ProductVariant.restore({
        ...variant,
        deletedAt: new Date(),
      });
      productVariantRepository.getProductVariantById.mockResolvedValue(
        deletedVariant,
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
          quantity: 1,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Product variant not found',
          details: [],
        }),
      );
      expect(cartRepository.getCartByUserId).not.toHaveBeenCalled();
      expect(cartItemRepository.createCartItem).not.toHaveBeenCalled();
    });

    it('translates a missing cart into a NotFoundException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      cartRepository.getCartByUserId.mockResolvedValue(null);

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
          quantity: 1,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Cart not found',
          details: [],
        }),
      );
      expect(cartItemRepository.createCartItem).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted cart into a NotFoundException', async () => {
      const deletedCart = Cart.restore({ ...cart, deletedAt: new Date() });
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      cartRepository.getCartByUserId.mockResolvedValue(deletedCart);

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
          quantity: 1,
        }),
      ).rejects.toThrow(
        new NotFoundException({
          error: 'Cart not found',
          details: [],
        }),
      );
      expect(cartItemRepository.createCartItem).not.toHaveBeenCalled();
    });

    it('translates an unexpected failure into an InternalServerErrorException', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(variant);
      cartRepository.getCartByUserId.mockResolvedValue(cart);
      cartItemRepository.createCartItem.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        useCase.execute({
          userId: 'user-id',
          productVariantId: 'variant-id',
          quantity: 1,
        }),
      ).rejects.toThrow(
        new InternalServerErrorException({
          error: 'connection lost',
          details: [],
        }),
      );
    });
  });
});
