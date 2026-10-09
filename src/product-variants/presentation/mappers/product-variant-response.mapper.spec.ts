import { ProductImageUrl } from '../../../products/application/types/product-image-url';
import { ProductImageResponseMapper } from '../../../products/presentation/mappers/product-image-response.mapper';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantResponseMapper } from './product-variant-response.mapper';

describe('ProductVariantResponseMapper', () => {
  const variant = ProductVariant.restore({
    id: 'variant-id',
    sku: 'TS-000001-MED-BLU',
    price: 19.99,
    stock: 100,
    disabled: false,
    attributes: { size: 'medium', color: 'blue' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
  });
  const imageUrlFor = (id: string): ProductImageUrl => ({
    id,
    url: `https://bucket.s3.amazonaws.com/products/product-id/${id}.png?signed`,
    expiresIn: 3600,
    isDefault: false,
    variantId: 'variant-id',
  });
  const firstImage = imageUrlFor('image-1');
  const secondImage = imageUrlFor('image-2');

  describe('toResponse', () => {
    it('maps the base variant fields', () => {
      const result = ProductVariantResponseMapper.toResponse(variant);

      expect(result).toEqual({
        id: 'variant-id',
        sku: 'TS-000001-MED-BLU',
        price: 19.99,
        stock: 100,
        disabled: false,
        attributes: { size: 'medium', color: 'blue' },
        productId: 'product-id',
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
        deletedAt: null,
      });
    });

    it('omits the images key entirely when no images are passed', () => {
      const result = ProductVariantResponseMapper.toResponse(variant);

      expect(result).not.toHaveProperty('images');
    });

    it('includes an empty images array when an empty list is passed', () => {
      const result = ProductVariantResponseMapper.toResponse(variant, []);

      expect(result).toHaveProperty('images', []);
    });

    it('maps each passed image via ProductImageResponseMapper, keeping their order', () => {
      const result = ProductVariantResponseMapper.toResponse(variant, [
        secondImage,
        firstImage,
      ]);

      expect(result.images).toEqual([
        ProductImageResponseMapper.toResponse(secondImage),
        ProductImageResponseMapper.toResponse(firstImage),
      ]);
      expect(result.images?.map((image) => image.id)).toEqual([
        'image-2',
        'image-1',
      ]);
    });

    it('keeps the base variant fields when images are passed', () => {
      const result = ProductVariantResponseMapper.toResponse(variant, [
        firstImage,
      ]);

      expect(result).toMatchObject(
        ProductVariantResponseMapper.toResponse(variant),
      );
    });
  });
});
