import { LikedProductVariant } from './liked-product-variant';

describe('LikedProductVariant', () => {
  it('is defined', () => {
    expect(
      LikedProductVariant.create({
        userId: 'user-id',
        productVariantId: 'variant-id',
      }),
    ).toBeDefined();
  });

  describe('create', () => {
    it('generates a fresh id for a brand-new like', () => {
      const like = LikedProductVariant.create({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });

      expect(like.id).toEqual(expect.any(String));
    });

    it('carries through userId and productVariantId from the input props', () => {
      const like = LikedProductVariant.create({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });

      expect(like.userId).toBe('user-id');
      expect(like.productVariantId).toBe('variant-id');
    });

    it('initializes timestamps and sets deletedAt to null', () => {
      const before = Date.now();

      const like = LikedProductVariant.create({
        userId: 'user-id',
        productVariantId: 'variant-id',
      });

      const after = Date.now();
      expect(like.deletedAt).toBeNull();
      expect(like.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(like.createdAt.getTime()).toBeLessThanOrEqual(after);
      expect(like.updatedAt).toEqual(like.createdAt);
    });
  });

  describe('restore', () => {
    it('rehydrates all fields as-is from persistence', () => {
      const props = {
        id: 'like-id',
        userId: 'user-id',
        productVariantId: 'variant-id',
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-02T00:00:00.000Z'),
        deletedAt: null,
      };

      const like = LikedProductVariant.restore(props);

      expect(like).toMatchObject(props);
    });
  });
});
