import { CartItem } from './cart-item';

describe('CartItem', () => {
  it('is defined', () => {
    expect(
      CartItem.create({
        cartId: 'cart-id',
        productVariantId: 'variant-id',
        quantity: 1,
      }),
    ).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for a brand-new cart item', () => {
      const cartItem = CartItem.create({
        cartId: 'cart-id',
        productVariantId: 'variant-id',
        quantity: 1,
      });

      expect(cartItem.id).toEqual(expect.any(String));
    });

    it('carries through cartId, productVariantId and quantity from the input props', () => {
      const cartItem = CartItem.create({
        cartId: 'cart-id',
        productVariantId: 'variant-id',
        quantity: 3,
      });

      expect(cartItem.cartId).toBe('cart-id');
      expect(cartItem.productVariantId).toBe('variant-id');
      expect(cartItem.quantity).toBe(3);
    });

    it('initializes timestamps and sets deletedAt to null', () => {
      const before = Date.now();

      const cartItem = CartItem.create({
        cartId: 'cart-id',
        productVariantId: 'variant-id',
        quantity: 1,
      });

      const after = Date.now();
      expect(cartItem.deletedAt).toBeNull();
      expect(cartItem.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(cartItem.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(cartItem.updatedAt).toEqual(cartItem.createdAt);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'cart-item-id',
        cartId: 'cart-id',
        productVariantId: 'variant-id',
        quantity: 2,
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
      };

      const cartItem = CartItem.restore(props);

      expect(cartItem).toMatchObject(props);
    });
  });
});
