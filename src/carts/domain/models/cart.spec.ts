import { Cart } from './cart';

describe('Cart', () => {
  it('is defined', () => {
    expect(Cart.create({ userId: 'user-id' })).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for a brand-new cart', () => {
      const cart = Cart.create({ userId: 'user-id' });

      expect(cart.id).toEqual(expect.any(String));
    });

    it('carries through userId from the input props', () => {
      const cart = Cart.create({ userId: 'user-id' });

      expect(cart.userId).toBe('user-id');
    });

    it('initializes timestamps and sets deletedAt to null', () => {
      const before = Date.now();

      const cart = Cart.create({ userId: 'user-id' });

      const after = Date.now();
      expect(cart.deletedAt).toBeNull();
      expect(cart.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(cart.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(cart.updatedAt).toEqual(cart.createdAt);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'cart-id',
        userId: 'user-id',
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
      };

      const cart = Cart.restore(props);

      expect(cart).toMatchObject(props);
    });
  });
});
