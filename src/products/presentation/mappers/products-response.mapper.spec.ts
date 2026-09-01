import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
import { ProductVariantResponseMapper } from '../../../product-variants/presentation/mappers/product-variant-response.mapper';
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
  });
});
