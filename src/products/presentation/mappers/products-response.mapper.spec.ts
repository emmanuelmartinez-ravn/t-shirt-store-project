import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
import { ProductVariantResponseMapper } from '../../../product-variants/presentation/mappers/product-variant-response.mapper';
import { ProductImageUrl } from '../../application/types/product-image-url';
import { Product } from '../../domain/models/product';
import { ProductsResponseMapper } from './products-response.mapper';

describe('ProductsResponseMapper', () => {
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
    it('is defined', () => {
      expect(ProductsResponseMapper.toResponse(product)).toBeDefined();
    });

    it('maps the base product fields', () => {
      const result = ProductsResponseMapper.toResponse(product);

      expect(result).toMatchObject({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        disabled: product.disabled,
        categoryId: product.categoryId,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
      });
    });

    it('maps a null categoryId through unchanged when the product has no category', () => {
      const productWithoutCategory = Product.restore({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
        categoryId: null,
      });

      const result = ProductsResponseMapper.toResponse(productWithoutCategory);

      expect(result.categoryId).toBeNull();
    });

    it('omits the productVariants key entirely when productVariants is undefined', () => {
      const result = ProductsResponseMapper.toResponse(product);

      expect(result).not.toHaveProperty('productVariants');
    });

    it('includes an empty productVariants array when productVariants is an empty array', () => {
      const productWithNoVariants = Product.restore({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
        categoryId: product.categoryId,
        productVariants: [],
      });

      const result = ProductsResponseMapper.toResponse(productWithNoVariants);

      expect(result).toHaveProperty('productVariants', []);
    });

    it('maps each variant via ProductVariantResponseMapper when productVariants has entries', () => {
      const variant = ProductVariant.restore({
        id: 'variant-id',
        sku: 'TS-000001-BLK',
        price: 19.99,
        stock: 10,
        disabled: false,
        attributes: { color: 'black' },
        createdAt: new Date('2025-12-01T00:00:00.000Z'),
        updatedAt: new Date('2025-12-01T00:00:00.000Z'),
        deletedAt: null,
        productId: product.id,
      });
      const productWithVariants = Product.restore({
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        disabled: product.disabled,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        deletedAt: product.deletedAt,
        categoryId: product.categoryId,
        productVariants: [variant],
      });

      const result = ProductsResponseMapper.toResponse(productWithVariants);

      expect(result.productVariants).toEqual([
        ProductVariantResponseMapper.toResponse(variant),
      ]);
    });

    it('omits the images key entirely when no images are passed', () => {
      const result = ProductsResponseMapper.toResponse(product);

      expect(result).not.toHaveProperty('images');
    });

    it('maps each passed image via toImageResponse, keeping their order', () => {
      const result = ProductsResponseMapper.toResponse(product, [
        uploadedImage,
        defaultImage,
      ]);

      expect(result.images).toEqual([
        ProductsResponseMapper.toImageResponse(uploadedImage),
        ProductsResponseMapper.toImageResponse(defaultImage),
      ]);
    });

    it('includes an empty images array when an empty list is passed', () => {
      const result = ProductsResponseMapper.toResponse(product, []);

      expect(result).toHaveProperty('images', []);
    });
  });

  describe('toImageResponse', () => {
    it('maps an uploaded image with its presigned url and ttl', () => {
      expect(ProductsResponseMapper.toImageResponse(uploadedImage)).toEqual({
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

      expect(ProductsResponseMapper.toImageResponse(linkedImage)).toEqual({
        id: 'image-id',
        url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
        expiresIn: 3600,
        isDefault: false,
        variantId: 'variant-id',
      });
    });

    it('maps the default image with null id, expiresIn and variantId', () => {
      expect(ProductsResponseMapper.toImageResponse(defaultImage)).toEqual({
        id: null,
        url: 'http://localhost:3000/static/product_default.png',
        expiresIn: null,
        isDefault: true,
        variantId: null,
      });
    });

    it('returns a new object rather than the input', () => {
      expect(ProductsResponseMapper.toImageResponse(uploadedImage)).not.toBe(
        uploadedImage,
      );
    });
  });
});
