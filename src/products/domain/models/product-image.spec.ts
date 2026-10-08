import { ProductImage } from './product-image';

describe('ProductImage', () => {
  const createProps = {
    imagePath: 'products/product-id/image.png',
    productId: 'product-id',
  };

  it('is defined', () => {
    expect(ProductImage.create(createProps)).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for every brand-new image', () => {
      const first = ProductImage.create(createProps);
      const second = ProductImage.create(createProps);

      expect(first.id).toEqual(expect.any(String));
      expect(first.id).not.toBe(second.id);
    });

    it('sets the image path and product id from the given props, with no variant', () => {
      const image = ProductImage.create(createProps);

      expect(image.imagePath).toBe('products/product-id/image.png');
      expect(image.productId).toBe('product-id');
      expect(image.variantId).toBeNull();
    });

    it('initializes timestamps and leaves the image live', () => {
      const before = Date.now();

      const image = ProductImage.create(createProps);

      const after = Date.now();
      expect(image.deletedAt).toBeNull();
      expect(image.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(image.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(image.updatedAt).toEqual(image.createdAt);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'image-id',
        imagePath: 'products/product-id/image.jpg',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        deletedAt: new Date('2026-01-03T00:00:00.000Z'),
        productId: 'product-id',
        variantId: 'variant-id',
      };

      const image = ProductImage.restore(props);

      expect(image).toBeInstanceOf(ProductImage);
      expect(image).toMatchObject(props);
    });
  });
});
