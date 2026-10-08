import { Request } from 'express';
import { PaginationMapper } from '../../../common/pagination/pagination.mapper';
import { Product } from '../../domain/models/product';
import { CreateProductUseCase } from '../../application/use-cases/create-product.use-case';
import { DeleteProductImageUseCase } from '../../application/use-cases/delete-product-image.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/delete-product.use-case';
import { GetAllProductsUseCase } from '../../application/use-cases/get-all-products.use-case';
import { GetProductByIdUseCase } from '../../application/use-cases/get-product-by-id.use-case';
import { ToggleProductDisabledUseCase } from '../../application/use-cases/toggle-product-disabled.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/update-product.use-case';
import { UploadProductImagesUseCase } from '../../application/use-cases/upload-product-images.use-case';
import { ProductImageUrl } from '../../application/types/product-image-url';
import { ProductsResponseMapper } from '../mappers/products-response.mapper';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;
  let getAllProductsUseCase: jest.Mocked<GetAllProductsUseCase>;
  let getProductByIdUseCase: jest.Mocked<GetProductByIdUseCase>;
  let updateProductUseCase: jest.Mocked<UpdateProductUseCase>;
  let deleteProductUseCase: jest.Mocked<DeleteProductUseCase>;
  let toggleProductDisabledUseCase: jest.Mocked<ToggleProductDisabledUseCase>;
  let uploadProductImagesUseCase: jest.Mocked<UploadProductImagesUseCase>;
  let deleteProductImageUseCase: jest.Mocked<DeleteProductImageUseCase>;
  let req: Request;

  const product = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    code: 'TS-000001',
    description: 'A classic cotton t-shirt',
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });
  const defaultImageUrl = 'http://localhost:3000/static/product_default.png';
  const defaultImages: ProductImageUrl[] = [
    { id: null, url: defaultImageUrl, expiresIn: null, isDefault: true },
  ];
  const uploadedImages: ProductImageUrl[] = [
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
  const query = {
    page: 1,
    limit: 20,
    name: 'shirt',
    categoryId: 'category-id',
    fields: ['productVariants' as const],
  };

  const buildRequest = (extra: Record<string, unknown> = {}): Request =>
    ({
      protocol: 'http',
      get: jest.fn((header: string) =>
        header === 'host' ? 'localhost:3000' : undefined,
      ),
      ...extra,
    }) as unknown as Request;

  beforeEach(() => {
    createProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateProductUseCase>;
    getAllProductsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAllProductsUseCase>;
    getProductByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetProductByIdUseCase>;
    updateProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateProductUseCase>;
    deleteProductUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductUseCase>;
    toggleProductDisabledUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ToggleProductDisabledUseCase>;
    uploadProductImagesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UploadProductImagesUseCase>;
    deleteProductImageUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<DeleteProductImageUseCase>;
    req = buildRequest();

    controller = new ProductsController(
      createProductUseCase,
      getAllProductsUseCase,
      getProductByIdUseCase,
      updateProductUseCase,
      deleteProductUseCase,
      toggleProductDisabledUseCase,
      uploadProductImagesUseCase,
      deleteProductImageUseCase,
    );
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProduct', () => {
    it('delegates to the use case and returns the mapped response without images', async () => {
      createProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.createProduct({
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
      expect(result).not.toHaveProperty('images');
    });

    it('defaults a missing description to null', async () => {
      createProductUseCase.execute.mockResolvedValue(product);

      await controller.createProduct({
        name: 'Classic Tee',
        categoryId: 'category-id',
      });

      expect(createProductUseCase.execute).toHaveBeenCalledWith({
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      });
    });
  });

  describe('getAllProducts', () => {
    it('delegates to the use case with disabled: false, the query params and the default image url, and returns the mapped paginated response with images', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        items: [{ product, images: uploadedImages }],
        total: 1,
      });

      const result = await controller.getAllProducts(req, query);

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 20,
          name: 'shirt',
          categoryId: 'category-id',
          disabled: false,
          fields: ['productVariants'],
        },
        defaultImageUrl,
      );
      expect(result).toEqual({
        data: [ProductsResponseMapper.toResponse(product, uploadedImages)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
      expect(result.data[0].images).toHaveLength(2);
    });

    it('builds the default image url from the request protocol and host', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({ items: [], total: 0 });

      await controller.getAllProducts(
        buildRequest({
          protocol: 'https',
          get: jest.fn(() => 'api.example.com'),
        }),
        query,
      );

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith(
        expect.anything(),
        'https://api.example.com/static/product_default.png',
      );
    });
  });

  describe('getLikedProducts', () => {
    const likedReq = buildRequest({
      user: {
        sub: 'user-id',
        email: 'joe.doe@example.com',
        role: 'client',
        roleId: 'role-id',
      },
    });

    it('delegates to the use case with disabled: false, liked: true, the authenticated userId, the query params and the default image url, and returns the mapped paginated response with images', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        items: [{ product, images: defaultImages }],
        total: 1,
      });

      const result = await controller.getLikedProducts(likedReq, query);

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 20,
          name: 'shirt',
          categoryId: 'category-id',
          disabled: false,
          liked: true,
          userId: 'user-id',
          fields: ['productVariants'],
        },
        defaultImageUrl,
      );
      expect(result).toEqual({
        data: [ProductsResponseMapper.toResponse(product, defaultImages)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getDisabledProducts', () => {
    it('delegates to the use case with disabled: true, the query params and the default image url, and returns the mapped paginated response with images', async () => {
      getAllProductsUseCase.execute.mockResolvedValue({
        items: [{ product, images: defaultImages }],
        total: 1,
      });

      const result = await controller.getDisabledProducts(req, query);

      expect(getAllProductsUseCase.execute).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 20,
          name: 'shirt',
          categoryId: 'category-id',
          disabled: true,
          fields: ['productVariants'],
        },
        defaultImageUrl,
      );
      expect(result).toEqual({
        data: [ProductsResponseMapper.toResponse(product, defaultImages)],
        pagination: PaginationMapper.buildMeta(1, 20, 1),
      });
    });
  });

  describe('getProductById', () => {
    it('delegates to the use case with the default image url and returns the mapped response with images', async () => {
      getProductByIdUseCase.execute.mockResolvedValue({
        product,
        images: uploadedImages,
      });

      const result = await controller.getProductById('product-id', req);

      expect(getProductByIdUseCase.execute).toHaveBeenCalledWith(
        'product-id',
        defaultImageUrl,
      );
      expect(result).toEqual(
        ProductsResponseMapper.toResponse(product, uploadedImages),
      );
    });
  });

  describe('uploadImages', () => {
    const files = [
      {
        fieldname: 'images',
        originalname: 'front.png',
        mimetype: 'image/png',
        buffer: Buffer.from('front-bytes'),
        size: 11,
      },
      {
        fieldname: 'images',
        originalname: 'back.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('back-bytes'),
        size: 10,
      },
    ] as Express.Multer.File[];

    it('passes only the buffer, size and name of each file to the use case and returns the mapped image list', async () => {
      uploadProductImagesUseCase.execute.mockResolvedValue({
        images: uploadedImages,
      });

      const result = await controller.uploadImages('product-id', files);

      expect(uploadProductImagesUseCase.execute).toHaveBeenCalledWith(
        'product-id',
        [
          {
            buffer: files[0].buffer,
            size: 11,
            originalname: 'front.png',
          },
          {
            buffer: files[1].buffer,
            size: 10,
            originalname: 'back.jpg',
          },
        ],
      );
      expect(result).toEqual({
        images: uploadedImages.map((image) =>
          ProductsResponseMapper.toImageResponse(image),
        ),
      });
    });

    it('passes undefined files through when the request had none', async () => {
      uploadProductImagesUseCase.execute.mockResolvedValue({ images: [] });

      await controller.uploadImages('product-id', undefined);

      expect(uploadProductImagesUseCase.execute).toHaveBeenCalledWith(
        'product-id',
        undefined,
      );
    });

    it('propagates use case errors', async () => {
      const failure = new Error('upload failed');
      uploadProductImagesUseCase.execute.mockRejectedValue(failure);

      await expect(controller.uploadImages('product-id', files)).rejects.toBe(
        failure,
      );
    });
  });

  describe('deleteImage', () => {
    it('delegates to the use case with the image id and the default image url, and returns the mapped remaining images', async () => {
      deleteProductImageUseCase.execute.mockResolvedValue({
        images: uploadedImages,
      });

      const result = await controller.deleteImage('image-id', req);

      expect(deleteProductImageUseCase.execute).toHaveBeenCalledWith(
        'image-id',
        defaultImageUrl,
      );
      expect(result).toEqual({
        images: uploadedImages.map((image) =>
          ProductsResponseMapper.toImageResponse(image),
        ),
      });
    });

    it('returns the mapped default image when no images remain', async () => {
      deleteProductImageUseCase.execute.mockResolvedValue({
        images: defaultImages,
      });

      const result = await controller.deleteImage('image-id', req);

      expect(result).toEqual({
        images: [ProductsResponseMapper.toImageResponse(defaultImages[0])],
      });
    });

    it('builds the default image url from the request protocol and host', async () => {
      deleteProductImageUseCase.execute.mockResolvedValue({ images: [] });

      await controller.deleteImage(
        'image-id',
        buildRequest({
          protocol: 'https',
          get: jest.fn(() => 'api.example.com'),
        }),
      );

      expect(deleteProductImageUseCase.execute).toHaveBeenCalledWith(
        'image-id',
        'https://api.example.com/static/product_default.png',
      );
    });

    it('propagates use case errors', async () => {
      const failure = new Error('delete failed');
      deleteProductImageUseCase.execute.mockRejectedValue(failure);

      await expect(controller.deleteImage('image-id', req)).rejects.toBe(
        failure,
      );
    });
  });

  describe('updateProduct', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      updateProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.updateProduct('product-id', {
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });

      expect(updateProductUseCase.execute).toHaveBeenCalledWith('product-id', {
        name: 'Classic Tee',
        description: 'A classic cotton t-shirt',
        categoryId: 'category-id',
      });
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });

    it('defaults a missing description to null', async () => {
      updateProductUseCase.execute.mockResolvedValue(product);

      await controller.updateProduct('product-id', {
        name: 'Classic Tee',
        categoryId: 'category-id',
      });

      expect(updateProductUseCase.execute).toHaveBeenCalledWith('product-id', {
        name: 'Classic Tee',
        description: null,
        categoryId: 'category-id',
      });
    });
  });

  describe('deleteProduct', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      deleteProductUseCase.execute.mockResolvedValue(product);

      const result = await controller.deleteProduct('product-id');

      expect(deleteProductUseCase.execute).toHaveBeenCalledWith('product-id');
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });
  });

  describe('toggleDisabled', () => {
    it('delegates to the use case and returns the mapped response', async () => {
      toggleProductDisabledUseCase.execute.mockResolvedValue(product);

      const result = await controller.toggleDisabled('product-id');

      expect(toggleProductDisabledUseCase.execute).toHaveBeenCalledWith(
        'product-id',
      );
      expect(result).toEqual(ProductsResponseMapper.toResponse(product));
    });
  });
});
