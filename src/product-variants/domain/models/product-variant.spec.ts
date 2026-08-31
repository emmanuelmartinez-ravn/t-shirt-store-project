import { ProductVariant } from './product-variant';

describe('ProductVariant', () => {
  it('is defined', () => {
    expect(
      ProductVariant.create({
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
        productId: 'product-id',
      }),
    ).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for a brand-new product variant', () => {
      const variant = ProductVariant.create({
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
        productId: 'product-id',
      });

      expect(variant.id).toEqual(expect.any(String));
    });

    it('carries through sku, price, stock, attributes, and productId from the input props', () => {
      const variant = ProductVariant.create({
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
        productId: 'product-id',
      });

      expect(variant.sku).toBe('TS-000001-MED-BLU');
      expect(variant.price).toBe(19.99);
      expect(variant.stock).toBe(100);
      expect(variant.attributes).toEqual({ size: 'medium', color: 'blue' });
      expect(variant.productId).toBe('product-id');
    });

    it('sets disabled to false and initializes timestamps', () => {
      const before = Date.now();

      const variant = ProductVariant.create({
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        attributes: { size: 'medium', color: 'blue' },
        productId: 'product-id',
      });

      const after = Date.now();
      expect(variant.disabled).toBe(false);
      expect(variant.deletedAt).toBeNull();
      expect(variant.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(variant.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(variant.updatedAt).toEqual(variant.createdAt);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'variant-id',
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        disabled: false,
        attributes: { size: 'medium', color: 'blue' },
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
        productId: 'product-id',
      };

      const variant = ProductVariant.restore(props);

      expect(variant).toMatchObject(props);
    });
  });

  describe('generateSku', () => {
    it('joins the product code with an abbreviation for each attribute value', () => {
      expect(
        ProductVariant.generateSku('TS-000001', {
          size: 'medium',
          color: 'blue',
        }),
      ).toBe('TS-000001-MED-BLU');
    });

    it('supports a single attribute', () => {
      expect(ProductVariant.generateSku('TS-000002', { size: 'large' })).toBe(
        'TS-000002-LAR',
      );
    });

    it('does not pad a value shorter than 3 characters', () => {
      expect(ProductVariant.generateSku('TS-000003', { size: 'xs' })).toBe(
        'TS-000003-XS',
      );
    });

    it('trims values before slicing them', () => {
      expect(
        ProductVariant.generateSku('TS-000004', { size: '  medium  ' }),
      ).toBe('TS-000004-MED');
    });

    it('orders abbreviations according to attribute insertion order', () => {
      const sizeThenColor = ProductVariant.generateSku('TS-000005', {
        size: 'medium',
        color: 'blue',
      });
      const colorThenSize = ProductVariant.generateSku('TS-000005', {
        color: 'blue',
        size: 'medium',
      });

      expect(sizeThenColor).toBe('TS-000005-MED-BLU');
      expect(colorThenSize).toBe('TS-000005-BLU-MED');
      expect(sizeThenColor).not.toBe(colorThenSize);
    });
  });
});
