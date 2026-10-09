import { InternalServerErrorException } from '@nestjs/common';
import { ProductImageUrlsService } from '../../../products/application/services/product-image-urls.service';
import { ProductImageUrl } from '../../../products/application/types/product-image-url';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';
import { GetAllProductVariantsUseCase } from './get-all-product-variants.use-case';

describe('GetAllProductVariantsUseCase', () => {
  let useCase: GetAllProductVariantsUseCase;
  let productVariantRepository: jest.Mocked<ProductVariantRepository>;
  let productImageUrlsService: jest.Mocked<ProductImageUrlsService>;

  const variant = ProductVariant.restore({
    id: 'variant-id',
    sku: 'TS-000001-MED-BLU',
    price: 19.99,
    stock: 100,
    disabled: false,
    attributes: { size: 'medium', color: 'blue' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    productId: 'product-id',
  });
  const otherVariant = ProductVariant.restore({
    id: 'other-variant-id',
    sku: 'TS-000001-LRG-RED',
    price: 21.99,
    stock: 50,
    disabled: false,
    attributes: { size: 'large', color: 'red' },
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    productId: 'product-id',
  });
  const variants = [variant, otherVariant];
  const imageUrlFor = (id: string, variantId: string): ProductImageUrl => ({
    id,
    url: `https://bucket.s3.amazonaws.com/products/product-id/${id}.png?signed`,
    expiresIn: 3600,
    isDefault: false,
    variantId,
  });
  const variantImages = [
    imageUrlFor('image-1', 'variant-id'),
    imageUrlFor('image-2', 'variant-id'),
  ];
  const params = {
    productId: 'product-id',
    page: 1,
    limit: 20,
    disabled: false,
  };

  beforeEach(() => {
    productVariantRepository = {
      createProductVariant: jest.fn(),
      getAllProductVariants: jest.fn(),
      getProductVariantById: jest.fn(),
    };
    productImageUrlsService = {
      getImageUrls: jest.fn(),
      getImageUrlsByVariantIds: jest.fn(),
      getImageUrl: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productVariantRepository.getAllProductVariants.mockResolvedValue({
      items: variants,
      total: 7,
    });
    productImageUrlsService.getImageUrlsByVariantIds.mockResolvedValue(
      new Map([['variant-id', variantImages]]),
    );

    useCase = new GetAllProductVariantsUseCase(
      productVariantRepository,
      productImageUrlsService,
    );
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('returns each variant of the page with its images in the order the service provides, plus the total', async () => {
      const result = await useCase.execute(params);

      expect(result).toEqual({
        items: [
          { variant, images: variantImages },
          { variant: otherVariant, images: [] },
        ],
        total: 7,
      });
      expect(result.items[0].images.map((image) => image.id)).toEqual([
        'image-1',
        'image-2',
      ]);
    });

    it('gives an empty image list to a variant absent from the image map', async () => {
      productImageUrlsService.getImageUrlsByVariantIds.mockResolvedValue(
        new Map(),
      );

      const result = await useCase.execute(params);

      expect(result.items).toEqual([
        { variant, images: [] },
        { variant: otherVariant, images: [] },
      ]);
    });

    it('fetches the images of every variant on the page in a single call, in page order', async () => {
      await useCase.execute(params);

      expect(
        productImageUrlsService.getImageUrlsByVariantIds,
      ).toHaveBeenCalledTimes(1);
      expect(
        productImageUrlsService.getImageUrlsByVariantIds,
      ).toHaveBeenCalledWith(['variant-id', 'other-variant-id']);
      expect(productImageUrlsService.getImageUrls).not.toHaveBeenCalled();
    });

    it('fetches images with an empty id list and returns no items when the page is empty', async () => {
      productVariantRepository.getAllProductVariants.mockResolvedValue({
        items: [],
        total: 0,
      });
      productImageUrlsService.getImageUrlsByVariantIds.mockResolvedValue(
        new Map(),
      );

      const result = await useCase.execute(params);

      expect(
        productImageUrlsService.getImageUrlsByVariantIds,
      ).toHaveBeenCalledWith([]);
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('passes the params through unchanged to the repository, including optional filters', async () => {
      const filteredParams = {
        productId: 'product-id',
        page: 2,
        limit: 10,
        disabled: true,
        liked: true,
        userId: 'user-id',
      };

      await useCase.execute(filteredParams);

      expect(
        productVariantRepository.getAllProductVariants,
      ).toHaveBeenCalledWith(filteredParams);
    });

    it('passes the params through unchanged to the repository when optional filters are omitted', async () => {
      await useCase.execute(params);

      expect(
        productVariantRepository.getAllProductVariants,
      ).toHaveBeenCalledWith(params);
    });

    it('translates a repository failure into an InternalServerErrorException without fetching images', async () => {
      productVariantRepository.getAllProductVariants.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(useCase.execute(params)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(
        productImageUrlsService.getImageUrlsByVariantIds,
      ).not.toHaveBeenCalled();
    });

    it('translates an image lookup or presign failure into an InternalServerErrorException with the standard payload', async () => {
      productImageUrlsService.getImageUrlsByVariantIds.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute(params);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Internal Server Error', details: [] },
      });
    });
  });
});
