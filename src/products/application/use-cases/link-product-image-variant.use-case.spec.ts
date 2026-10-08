import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariant } from '../../../product-variants/domain/models/product-variant';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { ProductImageNotFoundError } from '../../domain/errors/product-image-not-found';
import { Product } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';
import { LinkProductImageVariantUseCase } from './link-product-image-variant.use-case';

describe('LinkProductImageVariantUseCase', () => {
  let useCase: LinkProductImageVariantUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let productImageUrlsService: jest.Mocked<ProductImageUrlsService>;

  const product = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    code: 'TS-000001',
    description: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });
  const image = ProductImage.restore({
    id: 'image-id',
    imagePath: 'products/product-id/image.png',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
    variantId: null,
  });
  const imageLinkedToVariant = ProductImage.restore({
    ...image,
    variantId: 'variant-id',
  });
  const imageLinkedToOtherVariant = ProductImage.restore({
    ...image,
    variantId: 'other-variant-id',
  });
  const variant = ProductVariant.restore({
    id: 'variant-id',
    sku: 'TS-000001-M-BLK',
    price: 19.99,
    stock: 10,
    disabled: false,
    attributes: { size: 'M', color: 'black' },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    productId: 'product-id',
  });
  const variantOfOtherProduct = ProductVariant.restore({
    ...variant,
    productId: 'other-product-id',
  });
  const linkedImageUrl: ProductImageUrl = {
    id: 'image-id',
    url: 'https://bucket.s3.amazonaws.com/products/product-id/image.png?signed',
    expiresIn: 3600,
    isDefault: false,
    variantId: 'variant-id',
  };
  const imageNotFoundResponse = {
    response: { error: 'Product image not found', details: [] },
  };
  const variantNotFoundResponse = {
    response: { error: 'Product variant not found', details: [] },
  };
  const linkFailedResponse = {
    response: { error: 'Failed to link product image', details: [] },
  };

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      setDisabled: jest.fn(),
      getProductById: jest.fn(),
      getLastProductCode: jest.fn(),
    };
    productImageRepository = {
      countActiveImages: jest.fn(),
      createImages: jest.fn(),
      getActiveImagesByProductIds: jest.fn(),
      getActiveImageById: jest.fn(),
      deleteImage: jest.fn(),
      updateImageVariant: jest.fn(),
    };
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getAllProductVariants: jest.fn(),
      getProductVariantById: jest.fn(),
      updateProductVariant: jest.fn(),
      deleteProductVariant: jest.fn(),
    };
    productImageUrlsService = {
      getImageUrls: jest.fn(),
      getImageUrl: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productImageRepository.getActiveImageById.mockResolvedValue(image);
    productRepository.getProductById.mockResolvedValue(product);
    productVariantRepository.getProductVariantById.mockResolvedValue(variant);
    productImageRepository.updateImageVariant.mockImplementation((updated) =>
      Promise.resolve(updated),
    );
    productImageUrlsService.getImageUrl.mockResolvedValue(linkedImageUrl);

    useCase = new LinkProductImageVariantUseCase(
      productRepository,
      productImageRepository,
      productVariantRepository,
      productImageUrlsService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('links an unlinked image to a variant of its product and returns the presigned image', async () => {
      const result = await useCase.execute('image-id', 'variant-id');

      expect(productImageRepository.getActiveImageById).toHaveBeenCalledWith(
        'image-id',
      );
      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(
        productVariantRepository.getProductVariantById,
      ).toHaveBeenCalledWith('variant-id');
      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(linkedImageUrl);
    });

    it('persists a copy of the image with the variant id and a fresh updatedAt, keeping every other field', async () => {
      const before = Date.now();

      await useCase.execute('image-id', 'variant-id');

      const after = Date.now();
      const [linked] = productImageRepository.updateImageVariant.mock.calls[0];
      expect(linked).toBeInstanceOf(ProductImage);
      expect(linked).not.toBe(image);
      expect(linked).toMatchObject({
        id: 'image-id',
        imagePath: 'products/product-id/image.png',
        createdAt: image.createdAt,
        deletedAt: null,
        productId: 'product-id',
        variantId: 'variant-id',
      });
      expect(linked.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(linked.updatedAt.getTime()).toBeLessThanOrEqual(after);
    });

    it('presigns the image returned by the repository', async () => {
      const persisted = ProductImage.restore({
        ...imageLinkedToVariant,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });
      productImageRepository.updateImageVariant.mockResolvedValue(persisted);

      await useCase.execute('image-id', 'variant-id');

      expect(productImageUrlsService.getImageUrl).toHaveBeenCalledTimes(1);
      expect(productImageUrlsService.getImageUrl).toHaveBeenCalledWith(
        persisted,
      );
    });

    it('allows linking to a disabled variant', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(
        ProductVariant.restore({ ...variant, disabled: true }),
      );

      const result = await useCase.execute('image-id', 'variant-id');

      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(linkedImageUrl);
    });

    it('allows linking an image of a disabled product', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, disabled: true }),
      );

      const result = await useCase.execute('image-id', 'variant-id');

      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
      expect(result).toBe(linkedImageUrl);
    });

    it('returns the presigned image without writing when it is already linked to the same variant', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(
        imageLinkedToVariant,
      );

      const result = await useCase.execute('image-id', 'variant-id');

      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
      expect(productImageUrlsService.getImageUrl).toHaveBeenCalledWith(
        imageLinkedToVariant,
      );
      expect(result).toBe(linkedImageUrl);
    });

    it('translates a presign failure on the already-linked path into an InternalServerErrorException', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(
        imageLinkedToVariant,
      );
      productImageUrlsService.getImageUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(linkFailedResponse);
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates an image linked to a different variant into a ConflictException naming the current variant, without writing', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(
        imageLinkedToOtherVariant,
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Product image is already linked to a variant',
          details: ['Linked to variant other-variant-id; unlink it first'],
        },
      });
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates a missing or already-deleted image into a NotFoundException without further lookups', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(null);

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(imageNotFoundResponse);
      expect(productRepository.getProductById).not.toHaveBeenCalled();
      expect(
        productVariantRepository.getProductVariantById,
      ).not.toHaveBeenCalled();
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it("translates a missing image's product into an image NotFoundException without looking up the variant", async () => {
      productRepository.getProductById.mockResolvedValue(null);

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(imageNotFoundResponse);
      expect(
        productVariantRepository.getProductVariantById,
      ).not.toHaveBeenCalled();
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it("translates a soft-deleted image's product into an image NotFoundException without looking up the variant", async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(imageNotFoundResponse);
      expect(
        productVariantRepository.getProductVariantById,
      ).not.toHaveBeenCalled();
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates a missing variant into a variant NotFoundException without writing', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(null);

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(variantNotFoundResponse);
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted variant into a variant NotFoundException without writing', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(
        ProductVariant.restore({ ...variant, deletedAt: new Date() }),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(variantNotFoundResponse);
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates a variant of another product into a BadRequestException without writing', async () => {
      productVariantRepository.getProductVariantById.mockResolvedValue(
        variantOfOtherProduct,
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: "Variant does not belong to the image's product",
          details: [],
        },
      });
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('reports a variant of another product as a BadRequestException even when the image is linked to a different variant', async () => {
      productImageRepository.getActiveImageById.mockResolvedValue(
        imageLinkedToOtherVariant,
      );
      productVariantRepository.getProductVariantById.mockResolvedValue(
        variantOfOtherProduct,
      );

      await expect(useCase.execute('image-id', 'variant-id')).rejects.toThrow(
        BadRequestException,
      );
      expect(productImageRepository.updateImageVariant).not.toHaveBeenCalled();
    });

    it('translates an image deleted concurrently into a NotFoundException without presigning', async () => {
      productImageRepository.updateImageVariant.mockRejectedValue(
        new ProductImageNotFoundError('image-id'),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject(imageNotFoundResponse);
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates a write failure into an InternalServerErrorException without presigning', async () => {
      productImageRepository.updateImageVariant.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(linkFailedResponse);
      expect(productImageUrlsService.getImageUrl).not.toHaveBeenCalled();
    });

    it('translates an unexpected lookup failure into an InternalServerErrorException', async () => {
      productVariantRepository.getProductVariantById.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(linkFailedResponse);
    });

    it('translates a presign failure after linking into an InternalServerErrorException', async () => {
      productImageUrlsService.getImageUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('image-id', 'variant-id');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(linkFailedResponse);
      expect(productImageRepository.updateImageVariant).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
