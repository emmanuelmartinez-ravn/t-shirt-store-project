import { Product } from './product';

describe('Product', () => {
  it('is defined', () => {
    expect(
      Product.create({
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      }),
    ).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for a brand-new product', () => {
      const product = Product.create({
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(product.id).toEqual(expect.any(String));
    });

    it('sets the code from the given props', () => {
      const product = Product.create({
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(product.code).toBe('TS-000001');
    });

    it('sets disabled to false and initializes timestamps', () => {
      const before = Date.now();

      const product = Product.create({
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      const after = Date.now();
      expect(product.disabled).toBe(false);
      expect(product.deletedAt).toBeNull();
      expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(product.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(product.updatedAt).toEqual(product.createdAt);
    });
  });

  describe('update', () => {
    it('preserves id, code, createdAt, and deletedAt while applying the new fields', () => {
      const product = Product.restore({
        id: 'product-id',
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        disabled: false,
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        categoryId: 'category-id',
      });

      const updated = Product.update(product, {
        name: 'Premium Tee',
        description: 'An upgraded cotton t-shirt',
        categoryId: 'new-category-id',
      });

      expect(updated.id).toBe(product.id);
      expect(updated.code).toBe(product.code);
      expect(updated.createdAt).toBe(product.createdAt);
      expect(updated.deletedAt).toBe(product.deletedAt);
      expect(updated.name).toBe('Premium Tee');
      expect(updated.description).toBe('An upgraded cotton t-shirt');
      expect(updated.categoryId).toBe('new-category-id');
    });

    it('bumps updatedAt', () => {
      const product = Product.restore({
        id: 'product-id',
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        disabled: false,
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        categoryId: 'category-id',
      });
      const before = Date.now();

      const updated = Product.update(product, {
        name: 'Premium Tee',
        description: 'An upgraded cotton t-shirt',
        categoryId: 'new-category-id',
      });

      const after = Date.now();
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('delete', () => {
    it('sets deletedAt while preserving everything else including the code', () => {
      const product = Product.restore({
        id: 'product-id',
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        disabled: false,
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        categoryId: 'category-id',
      });
      const before = Date.now();

      const deleted = Product.delete(product);

      const after = Date.now();
      expect(deleted.id).toBe(product.id);
      expect(deleted.code).toBe(product.code);
      expect(deleted.name).toBe(product.name);
      expect(deleted.description).toBe(product.description);
      expect(deleted.disabled).toBe(product.disabled);
      expect(deleted.createdAt).toBe(product.createdAt);
      expect(deleted.categoryId).toBe(product.categoryId);
      expect(deleted.deletedAt).not.toBeNull();
      expect(deleted.deletedAt?.getTime()).toBeGreaterThanOrEqual(before);
      expect(deleted.deletedAt?.getTime()).toBeLessThanOrEqual(after);
      expect(deleted.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(deleted.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'product-id',
        name: 'Classic Tee',
        code: 'TS-000001',
        description: 'A classic cotton t-shirt',
        disabled: false,
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        categoryId: 'category-id',
      };

      const product = Product.restore(props);

      expect(product).toMatchObject(props);
    });
  });

  describe('generateNextCode', () => {
    it('returns the first code when there is no previous one', () => {
      expect(Product.generateNextCode(null)).toBe('TS-000001');
    });

    it('increments the trailing number of the last code', () => {
      expect(Product.generateNextCode('TS-000001')).toBe('TS-000002');
    });

    it('increments a non-trivial existing number', () => {
      expect(Product.generateNextCode('TS-000041')).toBe('TS-000042');
    });

    it('grows past 6 digits without truncating near the padding boundary', () => {
      expect(Product.generateNextCode('TS-999999')).toBe('TS-1000000');
    });
  });
});
