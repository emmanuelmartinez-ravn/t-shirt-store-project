import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductImageUrlsService } from './product-image-urls.service';

describe('ProductImageUrlsService', () => {
  let service: ProductImageUrlsService;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;

  const originalTtl = process.env.AWS_S3_SIGNED_URL_TTL;

  const images = [
    ProductImage.restore({
      id: 'image-1',
      imagePath: 'products/product-id/first.png',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      productId: 'product-id',
      variantId: null,
    }),
    ProductImage.restore({
      id: 'image-2',
      imagePath: 'products/product-id/second.jpg',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      deletedAt: null,
      productId: 'product-id',
      variantId: 'variant-id',
    }),
  ];
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
  const signedUrlFor = (key: string): string =>
    `https://bucket.s3.amazonaws.com/${key}?signed`;

  beforeEach(() => {
    delete process.env.AWS_S3_SIGNED_URL_TTL;

    productImageRepository = {
      countActiveImages: jest.fn(),
      createImages: jest.fn(),
      getActiveImagesByProductIds: jest.fn(),
      getActiveImagesByVariantIds: jest.fn(),
      getActiveImageById: jest.fn(),
      deleteImage: jest.fn(),
      updateImageVariant: jest.fn(),
    };
    fileStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    productImageRepository.getActiveImagesByProductIds.mockResolvedValue(
      images,
    );
    fileStorageService.getSignedUrl.mockImplementation((key) =>
      Promise.resolve(signedUrlFor(key)),
    );

    service = new ProductImageUrlsService(
      productImageRepository,
      fileStorageService,
    );
  });

  afterEach(() => {
    if (originalTtl === undefined) {
      delete process.env.AWS_S3_SIGNED_URL_TTL;
    } else {
      process.env.AWS_S3_SIGNED_URL_TTL = originalTtl;
    }
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getImageUrls', () => {
    it('returns a presigned url per active image, in repository order, with the default ttl and each linked variant id', async () => {
      const result = await service.getImageUrls('product-id', defaultImageUrl);

      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledWith(['product-id']);
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledTimes(2);
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        images[0].imagePath,
      );
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        images[1].imagePath,
      );
      expect(result).toEqual([
        {
          id: 'image-1',
          url: signedUrlFor(images[0].imagePath),
          expiresIn: 3600,
          isDefault: false,
          variantId: null,
        },
        {
          id: 'image-2',
          url: signedUrlFor(images[1].imagePath),
          expiresIn: 3600,
          isDefault: false,
          variantId: 'variant-id',
        },
      ]);
    });

    it('returns the presigned list without a default entry when no default image url is given', async () => {
      const result = await service.getImageUrls('product-id');

      expect(result.map((image) => image.id)).toEqual(['image-1', 'image-2']);
      expect(result.every((image) => !image.isDefault)).toBe(true);
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const result = await service.getImageUrls('product-id', defaultImageUrl);

      expect(result.map((image) => image.expiresIn)).toEqual([900, 900]);
    });

    it('returns a single default image entry when the product has no images and a default image url is given', async () => {
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue([]);

      const result = await service.getImageUrls('product-id', defaultImageUrl);

      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).toHaveBeenCalledWith(['product-id']);
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: null,
          url: defaultImageUrl,
          expiresIn: null,
          isDefault: true,
          variantId: null,
        },
      ]);
    });

    it('returns an empty list when the product has no images and no default image url is given', async () => {
      productImageRepository.getActiveImagesByProductIds.mockResolvedValue([]);

      const result = await service.getImageUrls('product-id');

      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('propagates a presign failure', async () => {
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      await expect(
        service.getImageUrls('product-id', defaultImageUrl),
      ).rejects.toThrow('presign failed');
    });

    it('propagates a repository failure without presigning', async () => {
      productImageRepository.getActiveImagesByProductIds.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(service.getImageUrls('product-id')).rejects.toThrow(
        'connection lost',
      );
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('getImageUrlsByVariantIds', () => {
    const variantImageFor = (
      id: string,
      variantId: string | null,
      day: number,
    ): ProductImage =>
      ProductImage.restore({
        id,
        imagePath: `products/product-id/${id}.png`,
        createdAt: new Date(`2026-01-0${day}T00:00:00.000Z`),
        updatedAt: new Date(`2026-01-0${day}T00:00:00.000Z`),
        deletedAt: null,
        productId: 'product-id',
        variantId,
      });
    const variantImages = [
      variantImageFor('image-a1', 'variant-a', 1),
      variantImageFor('image-b1', 'variant-b', 2),
      variantImageFor('image-a2', 'variant-a', 3),
      variantImageFor('image-b2', 'variant-b', 4),
    ];
    const variantIds = ['variant-a', 'variant-b', 'variant-c'];

    beforeEach(() => {
      productImageRepository.getActiveImagesByVariantIds.mockResolvedValue(
        variantImages,
      );
    });

    it('queries the repository once with all the given variant ids', async () => {
      await service.getImageUrlsByVariantIds(variantIds);

      expect(
        productImageRepository.getActiveImagesByVariantIds,
      ).toHaveBeenCalledTimes(1);
      expect(
        productImageRepository.getActiveImagesByVariantIds,
      ).toHaveBeenCalledWith(variantIds);
      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).not.toHaveBeenCalled();
    });

    it('groups interleaved images by variant id, preserving repository order within each variant', async () => {
      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect(result.get('variant-a')?.map((image) => image.id)).toEqual([
        'image-a1',
        'image-a2',
      ]);
      expect(result.get('variant-b')?.map((image) => image.id)).toEqual([
        'image-b1',
        'image-b2',
      ]);
    });

    it('presigns every image and builds each entry with the default ttl, isDefault false and its variant id', async () => {
      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect(fileStorageService.getSignedUrl).toHaveBeenCalledTimes(4);
      variantImages.forEach((image) =>
        expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
          image.imagePath,
        ),
      );
      expect(result.get('variant-a')).toEqual([
        {
          id: 'image-a1',
          url: signedUrlFor(variantImages[0].imagePath),
          expiresIn: 3600,
          isDefault: false,
          variantId: 'variant-a',
        },
        {
          id: 'image-a2',
          url: signedUrlFor(variantImages[2].imagePath),
          expiresIn: 3600,
          isDefault: false,
          variantId: 'variant-a',
        },
      ]);
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect(
        [...result.values()].flat().map((image) => image.expiresIn),
      ).toEqual([900, 900, 900, 900]);
    });

    it('leaves variants without images out of the map instead of adding a default entry', async () => {
      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect(result.has('variant-c')).toBe(false);
      expect([...result.keys()]).toEqual(['variant-a', 'variant-b']);
      expect(
        [...result.values()].flat().every((image) => !image.isDefault),
      ).toBe(true);
    });

    it('returns an empty map when no variant has images', async () => {
      productImageRepository.getActiveImagesByVariantIds.mockResolvedValue([]);

      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });

    it('skips images that are not linked to any variant', async () => {
      productImageRepository.getActiveImagesByVariantIds.mockResolvedValue([
        variantImageFor('image-unlinked', null, 1),
        variantImages[0],
      ]);

      const result = await service.getImageUrlsByVariantIds(variantIds);

      expect([...result.keys()]).toEqual(['variant-a']);
      expect(result.get('variant-a')?.map((image) => image.id)).toEqual([
        'image-a1',
      ]);
    });

    it('propagates a presign failure', async () => {
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      await expect(
        service.getImageUrlsByVariantIds(variantIds),
      ).rejects.toThrow('presign failed');
    });

    it('propagates a repository failure without presigning', async () => {
      productImageRepository.getActiveImagesByVariantIds.mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        service.getImageUrlsByVariantIds(variantIds),
      ).rejects.toThrow('connection lost');
      expect(fileStorageService.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('getImageUrl', () => {
    it('presigns a single unlinked image with the default ttl and a null variant id', async () => {
      const result = await service.getImageUrl(images[0]);

      expect(fileStorageService.getSignedUrl).toHaveBeenCalledTimes(1);
      expect(fileStorageService.getSignedUrl).toHaveBeenCalledWith(
        images[0].imagePath,
      );
      expect(result).toEqual({
        id: 'image-1',
        url: signedUrlFor(images[0].imagePath),
        expiresIn: 3600,
        isDefault: false,
        variantId: null,
      });
    });

    it('includes the variant id of a linked image', async () => {
      const result = await service.getImageUrl(images[1]);

      expect(result).toEqual({
        id: 'image-2',
        url: signedUrlFor(images[1].imagePath),
        expiresIn: 3600,
        isDefault: false,
        variantId: 'variant-id',
      });
    });

    it('reports the configured AWS_S3_SIGNED_URL_TTL as expiresIn', async () => {
      process.env.AWS_S3_SIGNED_URL_TTL = '900';

      const result = await service.getImageUrl(images[0]);

      expect(result.expiresIn).toBe(900);
    });

    it('presigns without querying the repository', async () => {
      await service.getImageUrl(images[0]);

      expect(
        productImageRepository.getActiveImagesByProductIds,
      ).not.toHaveBeenCalled();
    });

    it('propagates a presign failure', async () => {
      fileStorageService.getSignedUrl.mockRejectedValue(
        new Error('presign failed'),
      );

      await expect(service.getImageUrl(images[0])).rejects.toThrow(
        'presign failed',
      );
    });
  });
});
