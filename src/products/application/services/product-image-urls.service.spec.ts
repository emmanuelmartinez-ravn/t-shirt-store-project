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
      variantId: null,
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
      getActiveImageById: jest.fn(),
      deleteImage: jest.fn(),
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
    it('returns a presigned url per active image, in repository order, with the default ttl', async () => {
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
        },
        {
          id: 'image-2',
          url: signedUrlFor(images[1].imagePath),
          expiresIn: 3600,
          isDefault: false,
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
        { id: null, url: defaultImageUrl, expiresIn: null, isDefault: true },
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
});
