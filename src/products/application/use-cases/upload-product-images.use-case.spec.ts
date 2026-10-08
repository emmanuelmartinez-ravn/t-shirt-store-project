import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UnreadableImageError } from '../../../storage/errors/unreadable-image';
import { FileStorageService } from '../../../storage/services/file-storage.service';
import { ImageProcessorService } from '../../../storage/services/image-processor.service';
import { Product } from '../../domain/models/product';
import { ProductImage } from '../../domain/models/product-image';
import { ProductImageRepository } from '../../infrastructure/repositories/product-image.repository';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ProductImageUrlsService } from '../services/product-image-urls.service';
import { ProductImageUrl } from '../types/product-image-url';
import {
  ProductImageUpload,
  UploadProductImagesUseCase,
} from './upload-product-images.use-case';

describe('UploadProductImagesUseCase', () => {
  let useCase: UploadProductImagesUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let productImageRepository: jest.Mocked<ProductImageRepository>;
  let fileStorageService: jest.Mocked<FileStorageService>;
  let imageProcessorService: jest.Mocked<ImageProcessorService>;
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
  const front: ProductImageUpload = {
    buffer: Buffer.from('front-bytes'),
    size: 1024,
    originalname: 'front.png',
  };
  const back: ProductImageUpload = {
    buffer: Buffer.from('back-bytes'),
    size: 2048,
    originalname: 'back.jpg',
  };
  const side: ProductImageUpload = {
    buffer: Buffer.from('side-bytes'),
    size: 4096,
    originalname: 'side.png',
  };
  const pngMetadata = { format: 'png', width: 800, height: 800 };
  const jpegMetadata = { format: 'jpeg', width: 1024, height: 600 };
  const imageUrls: ProductImageUrl[] = [
    {
      id: 'image-1',
      url: 'https://bucket.s3.amazonaws.com/products/product-id/first.png?signed',
      expiresIn: 3600,
      isDefault: false,
    },
    {
      id: 'image-2',
      url: 'https://bucket.s3.amazonaws.com/products/product-id/second.jpg?signed',
      expiresIn: 3600,
      isDefault: false,
    },
  ];
  const pngKeyPattern = /^products\/product-id\/[0-9a-f-]{36}\.png$/;
  const jpgKeyPattern = /^products\/product-id\/[0-9a-f-]{36}\.jpg$/;
  const uploadFailedResponse = {
    response: { error: 'Failed to upload product images', details: [] },
  };

  const uploadedKeys = (): string[] =>
    fileStorageService.upload.mock.calls.map(([params]) => params.key);

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
    };
    fileStorageService = {
      upload: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
    };
    imageProcessorService = {
      getMetadata: jest.fn(),
      resizeToJpeg: jest.fn(),
      normalize: jest.fn(),
    };
    productImageUrlsService = {
      getImageUrls: jest.fn(),
    } as unknown as jest.Mocked<ProductImageUrlsService>;

    productRepository.getProductById.mockResolvedValue(product);
    productImageRepository.countActiveImages.mockResolvedValue(0);
    productImageRepository.createImages.mockResolvedValue(undefined);
    productImageUrlsService.getImageUrls.mockResolvedValue(imageUrls);
    imageProcessorService.getMetadata.mockResolvedValue(pngMetadata);
    imageProcessorService.normalize.mockImplementation((image) =>
      Promise.resolve(Buffer.concat([Buffer.from('normalized-'), image])),
    );
    fileStorageService.upload.mockResolvedValue(undefined);
    fileStorageService.delete.mockResolvedValue(undefined);

    useCase = new UploadProductImagesUseCase(
      productRepository,
      productImageRepository,
      fileStorageService,
      imageProcessorService,
      productImageUrlsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('normalizes, uploads and persists every image, then returns the product image list without a default image', async () => {
      const result = await useCase.execute('product-id', [front, side]);

      expect(productRepository.getProductById).toHaveBeenCalledWith(
        'product-id',
      );
      expect(imageProcessorService.normalize).toHaveBeenNthCalledWith(
        1,
        front.buffer,
        'png',
      );
      expect(imageProcessorService.normalize).toHaveBeenNthCalledWith(
        2,
        side.buffer,
        'png',
      );
      expect(fileStorageService.upload).toHaveBeenNthCalledWith(1, {
        key: expect.stringMatching(pngKeyPattern) as string,
        body: Buffer.from('normalized-front-bytes'),
        contentType: 'image/png',
      });
      expect(fileStorageService.upload).toHaveBeenNthCalledWith(2, {
        key: expect.stringMatching(pngKeyPattern) as string,
        body: Buffer.from('normalized-side-bytes'),
        contentType: 'image/png',
      });
      expect(productImageRepository.createImages).toHaveBeenCalledTimes(1);
      expect(productImageRepository.createImages).toHaveBeenCalledWith(
        uploadedKeys().map(
          (key): ProductImage =>
            expect.objectContaining({
              id: expect.any(String) as string,
              imagePath: key,
              productId: 'product-id',
              variantId: null,
              deletedAt: null,
            }) as ProductImage,
        ),
      );
      expect(productImageUrlsService.getImageUrls).toHaveBeenCalledTimes(1);
      expect(productImageUrlsService.getImageUrls).toHaveBeenCalledWith(
        'product-id',
      );
      expect(result).toEqual({ images: imageUrls });
    });

    it('builds the image list only after the new images are persisted', async () => {
      await useCase.execute('product-id', [front]);

      expect(
        productImageRepository.createImages.mock.invocationCallOrder[0],
      ).toBeLessThan(
        productImageUrlsService.getImageUrls.mock.invocationCallOrder[0],
      );
    });

    it('stores a jpeg under a .jpg key with an image/jpeg content type, keeping its format', async () => {
      imageProcessorService.getMetadata.mockResolvedValue(jpegMetadata);

      await useCase.execute('product-id', [back]);

      expect(imageProcessorService.normalize).toHaveBeenCalledWith(
        back.buffer,
        'jpeg',
      );
      expect(fileStorageService.upload).toHaveBeenCalledWith({
        key: expect.stringMatching(jpgKeyPattern) as string,
        body: Buffer.from('normalized-back-bytes'),
        contentType: 'image/jpeg',
      });
    });

    it('keeps each file in its own format when png and jpeg are mixed', async () => {
      imageProcessorService.getMetadata
        .mockResolvedValueOnce(pngMetadata)
        .mockResolvedValueOnce(jpegMetadata);

      await useCase.execute('product-id', [front, back]);

      const [frontKey, backKey] = uploadedKeys();
      expect(frontKey).toMatch(pngKeyPattern);
      expect(backKey).toMatch(jpgKeyPattern);
      expect(imageProcessorService.normalize).toHaveBeenNthCalledWith(
        2,
        back.buffer,
        'jpeg',
      );
    });

    it('generates a distinct storage key for every file', async () => {
      await useCase.execute('product-id', [front, side]);

      const [first, second] = uploadedKeys();
      expect(first).not.toBe(second);
    });

    it('allows uploading images to a disabled product', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, disabled: true }),
      );

      await useCase.execute('product-id', [front]);

      expect(fileStorageService.upload).toHaveBeenCalledTimes(1);
      expect(productImageRepository.createImages).toHaveBeenCalledTimes(1);
    });

    it('accepts an image exactly at the 5 MB size limit', async () => {
      await useCase.execute('product-id', [
        { ...front, size: 5 * 1024 * 1024 },
      ]);

      expect(fileStorageService.upload).toHaveBeenCalledTimes(1);
    });

    it('accepts an image exactly at the 1024x1024 boundary', async () => {
      imageProcessorService.getMetadata.mockResolvedValue({
        format: 'png',
        width: 1024,
        height: 1024,
      });

      await useCase.execute('product-id', [front]);

      expect(fileStorageService.upload).toHaveBeenCalledTimes(1);
    });

    it('accepts filling the product exactly up to 10 images', async () => {
      productImageRepository.countActiveImages.mockResolvedValue(8);

      await useCase.execute('product-id', [front, side]);

      expect(productImageRepository.countActiveImages).toHaveBeenCalledWith(
        'product-id',
      );
      expect(fileStorageService.upload).toHaveBeenCalledTimes(2);
    });

    it('translates a missing product into a NotFoundException without touching the files', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      const promise = useCase.execute('missing-id', [front]);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Product not found', details: [] },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates a soft-deleted product into a NotFoundException', async () => {
      productRepository.getProductById.mockResolvedValue(
        Product.restore({ ...product, deletedAt: new Date() }),
      );

      const promise = useCase.execute('product-id', [front]);

      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Product not found', details: [] },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('checks the product before complaining about missing files', async () => {
      productRepository.getProductById.mockResolvedValue(null);

      await expect(useCase.execute('missing-id', undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      ['undefined', undefined],
      ['an empty array', []],
    ])('rejects %s files with a BadRequestException', async (_label, files) => {
      const promise = useCase.execute('product-id', files);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'At least one image file is required',
          details: [],
        },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(productImageRepository.countActiveImages).not.toHaveBeenCalled();
    });

    it('rejects a file over 5 MB with a PayloadTooLargeException before reading it', async () => {
      const promise = useCase.execute('product-id', [
        { ...front, size: 5 * 1024 * 1024 + 1 },
      ]);

      await expect(promise).rejects.toThrow(PayloadTooLargeException);
      await expect(promise).rejects.toMatchObject({
        response: { error: 'Each image must be 5 MB or smaller', details: [] },
      });
      expect(imageProcessorService.getMetadata).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it.each([
      ['gif', { format: 'gif', width: 600, height: 600 }],
      ['webp', { format: 'webp', width: 600, height: 600 }],
      ['an unknown format', { format: undefined, width: 600, height: 600 }],
      ['a missing width', { format: 'png', width: undefined, height: 600 }],
      ['a missing height', { format: 'png', width: 600, height: undefined }],
    ])(
      'rejects an image with %s as an UnsupportedMediaTypeException naming the file',
      async (_label, metadata) => {
        imageProcessorService.getMetadata.mockResolvedValue(metadata);

        const promise = useCase.execute('product-id', [front]);

        await expect(promise).rejects.toThrow(UnsupportedMediaTypeException);
        await expect(promise).rejects.toMatchObject({
          response: {
            error: 'Unsupported image format',
            details: ['front.png: accepted formats are png, jpg, jpeg'],
          },
        });
        expect(imageProcessorService.normalize).not.toHaveBeenCalled();
        expect(fileStorageService.upload).not.toHaveBeenCalled();
      },
    );

    it('translates unreadable image bytes into an UnsupportedMediaTypeException naming the file', async () => {
      imageProcessorService.getMetadata.mockRejectedValue(
        new UnreadableImageError(),
      );

      const promise = useCase.execute('product-id', [front]);

      await expect(promise).rejects.toThrow(UnsupportedMediaTypeException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Unsupported image format',
          details: ['front.png: accepted formats are png, jpg, jpeg'],
        },
      });
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it.each([
      [1025, 800],
      [800, 1025],
    ])(
      'rejects a %ix%i image with a BadRequestException reporting the received dimensions',
      async (width, height) => {
        imageProcessorService.getMetadata.mockResolvedValue({
          format: 'png',
          width,
          height,
        });

        const promise = useCase.execute('product-id', [front]);

        await expect(promise).rejects.toThrow(BadRequestException);
        await expect(promise).rejects.toMatchObject({
          response: {
            error: 'Image dimensions must not exceed 1024x1024',
            details: [`front.png: received ${width}x${height}`],
          },
        });
        expect(fileStorageService.upload).not.toHaveBeenCalled();
      },
    );

    it('validates every file before uploading any, so a later invalid file blocks the earlier valid ones', async () => {
      imageProcessorService.getMetadata
        .mockResolvedValueOnce(pngMetadata)
        .mockResolvedValueOnce({ format: 'gif', width: 600, height: 600 });

      const promise = useCase.execute('product-id', [front, back]);

      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Unsupported image format',
          details: ['back.jpg: accepted formats are png, jpg, jpeg'],
        },
      });
      expect(imageProcessorService.getMetadata).toHaveBeenCalledTimes(2);
      expect(imageProcessorService.normalize).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
      expect(productImageRepository.createImages).not.toHaveBeenCalled();
    });

    it('reports a per-file validation error before the product image limit', async () => {
      productImageRepository.countActiveImages.mockResolvedValue(8);
      imageProcessorService.getMetadata
        .mockResolvedValueOnce(pngMetadata)
        .mockResolvedValueOnce({ format: 'png', width: 1200, height: 800 })
        .mockResolvedValueOnce(pngMetadata);

      const promise = useCase.execute('product-id', [front, back, side]);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'Image dimensions must not exceed 1024x1024',
          details: ['back.jpg: received 1200x800'],
        },
      });
      expect(productImageRepository.countActiveImages).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('rejects exceeding 10 images in total with a BadRequestException reporting the counts', async () => {
      productImageRepository.countActiveImages.mockResolvedValue(8);

      const promise = useCase.execute('product-id', [front, back, side]);

      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toMatchObject({
        response: {
          error: 'A product can have at most 10 images',
          details: ['Product has 8 images, tried to add 3'],
        },
      });
      expect(productImageRepository.countActiveImages).toHaveBeenCalledWith(
        'product-id',
      );
      expect(imageProcessorService.normalize).not.toHaveBeenCalled();
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('translates an unexpected metadata failure into an InternalServerErrorException', async () => {
      imageProcessorService.getMetadata.mockRejectedValue(
        new Error('sharp crashed'),
      );

      const promise = useCase.execute('product-id', [front]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      expect(fileStorageService.upload).not.toHaveBeenCalled();
    });

    it('deletes only the already-uploaded keys when a later upload fails', async () => {
      fileStorageService.upload
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('s3 unavailable'));

      const promise = useCase.execute('product-id', [front, back, side]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      const [firstKey] = uploadedKeys();
      expect(fileStorageService.upload).toHaveBeenCalledTimes(2);
      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledWith(firstKey);
      expect(productImageRepository.createImages).not.toHaveBeenCalled();
    });

    it('deletes the already-uploaded keys when normalizing a later file fails', async () => {
      imageProcessorService.normalize
        .mockResolvedValueOnce(Buffer.from('normalized-front'))
        .mockRejectedValueOnce(new Error('sharp crashed'));

      const promise = useCase.execute('product-id', [front, back, side]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      expect(fileStorageService.upload).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).toHaveBeenCalledWith(uploadedKeys()[0]);
      expect(productImageRepository.createImages).not.toHaveBeenCalled();
    });

    it('deletes every uploaded key when persisting the images fails', async () => {
      productImageRepository.createImages.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('product-id', [front, back, side]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      const keys = uploadedKeys();
      expect(keys).toHaveLength(3);
      expect(fileStorageService.delete).toHaveBeenCalledTimes(3);
      keys.forEach((key) =>
        expect(fileStorageService.delete).toHaveBeenCalledWith(key),
      );
      expect(productImageUrlsService.getImageUrls).not.toHaveBeenCalled();
    });

    it('warns and keeps cleaning up the remaining keys when a delete fails, still reporting an InternalServerErrorException', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn');
      productImageRepository.createImages.mockRejectedValue(
        new Error('connection lost'),
      );
      fileStorageService.delete
        .mockRejectedValueOnce(new Error('s3 unavailable'))
        .mockResolvedValueOnce(undefined);

      const promise = useCase.execute('product-id', [front, side]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      const [firstKey, secondKey] = uploadedKeys();
      expect(fileStorageService.delete).toHaveBeenCalledTimes(2);
      expect(fileStorageService.delete).toHaveBeenCalledWith(secondKey);
      expect(warn).toHaveBeenCalledWith(
        `Failed to clean up uploaded product image ${firstKey}`,
        expect.any(Error),
      );
    });

    it('translates an image list failure after persisting into an InternalServerErrorException without deleting the stored images', async () => {
      productImageUrlsService.getImageUrls.mockRejectedValue(
        new Error('presign failed'),
      );

      const promise = useCase.execute('product-id', [front]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
      expect(productImageRepository.createImages).toHaveBeenCalledTimes(1);
      expect(fileStorageService.delete).not.toHaveBeenCalled();
    });

    it('translates an unexpected lookup failure into an InternalServerErrorException', async () => {
      productRepository.getProductById.mockRejectedValue(
        new Error('connection lost'),
      );

      const promise = useCase.execute('product-id', [front]);

      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toMatchObject(uploadFailedResponse);
    });
  });
});
