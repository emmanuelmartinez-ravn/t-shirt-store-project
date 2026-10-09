import { ProductImageUrl } from '../../application/types/product-image-url';
import { ProductImageResponseMapper } from './product-image-response.mapper';

describe('ProductImageResponseMapper', () => {
  const uploadedImage: ProductImageUrl = {
    id: 'image-id',
    url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
    expiresIn: 3600,
    isDefault: false,
    variantId: null,
  };
  const defaultImage: ProductImageUrl = {
    id: null,
    url: 'http://localhost:3000/static/product_default.png',
    expiresIn: null,
    isDefault: true,
    variantId: null,
  };

  describe('toResponse', () => {
    it('maps an uploaded image with its presigned url and ttl', () => {
      expect(ProductImageResponseMapper.toResponse(uploadedImage)).toEqual({
        id: 'image-id',
        url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
        expiresIn: 3600,
        isDefault: false,
        variantId: null,
      });
    });

    it('copies the linked variant id of an uploaded image', () => {
      const linkedImage: ProductImageUrl = {
        ...uploadedImage,
        variantId: 'variant-id',
      };

      expect(ProductImageResponseMapper.toResponse(linkedImage)).toEqual({
        id: 'image-id',
        url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
        expiresIn: 3600,
        isDefault: false,
        variantId: 'variant-id',
      });
    });

    it('maps the default image with null id, expiresIn and variantId', () => {
      expect(ProductImageResponseMapper.toResponse(defaultImage)).toEqual({
        id: null,
        url: 'http://localhost:3000/static/product_default.png',
        expiresIn: null,
        isDefault: true,
        variantId: null,
      });
    });

    it('returns a new object rather than the input', () => {
      expect(ProductImageResponseMapper.toResponse(uploadedImage)).not.toBe(
        uploadedImage,
      );
    });
  });
});
