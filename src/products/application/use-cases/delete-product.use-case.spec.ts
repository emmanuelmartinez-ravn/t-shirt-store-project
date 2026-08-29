import {
  GoneException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { DeleteProductUseCase } from './delete-product.use-case';

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase;
  let productRepository: jest.Mocked<ProductRepository>;

  const existingProduct = Product.restore({
    id: 'product-id',
    name: 'Classic Tee',
    description: null,
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    categoryId: 'category-id',
  });

  beforeEach(() => {
    productRepository = {
      createProduct: jest.fn(),
      getAllProducts: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProductById: jest.fn(),
    };

    useCase = new DeleteProductUseCase(productRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('soft-deletes and returns the product', async () => {
    const persistedProduct = Product.restore({
      ...existingProduct,
      deletedAt: new Date(),
    });
    productRepository.getProductById.mockResolvedValue(existingProduct);
    productRepository.deleteProduct.mockResolvedValue(persistedProduct);

    const result = await useCase.execute('product-id');

    const [deletedProduct] = productRepository.deleteProduct.mock.calls[0];
    expect(deletedProduct.id).toBe('product-id');
    expect(deletedProduct.deletedAt).toBeInstanceOf(Date);
    expect(result).toBe(persistedProduct);
  });

  it('translates a missing product into a NotFoundException', async () => {
    productRepository.getProductById.mockResolvedValue(null);

    await expect(useCase.execute('product-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(productRepository.deleteProduct).not.toHaveBeenCalled();
  });

  it('translates an already-deleted product into a GoneException', async () => {
    const alreadyDeletedProduct = Product.restore({
      ...existingProduct,
      deletedAt: new Date(),
    });
    productRepository.getProductById.mockResolvedValue(alreadyDeletedProduct);

    await expect(useCase.execute('product-id')).rejects.toThrow(GoneException);
    expect(productRepository.deleteProduct).not.toHaveBeenCalled();
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getProductById.mockResolvedValue(existingProduct);
    productRepository.deleteProduct.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('product-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
