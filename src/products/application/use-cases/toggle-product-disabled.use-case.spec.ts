import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';
import { ToggleProductDisabledUseCase } from './toggle-product-disabled.use-case';

describe('ToggleProductDisabledUseCase', () => {
  let useCase: ToggleProductDisabledUseCase;
  let productRepository: jest.Mocked<ProductRepository>;

  const enabledProduct = Product.restore({
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

  const disabledProduct = Product.restore({
    ...enabledProduct,
    disabled: true,
  });

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

    useCase = new ToggleProductDisabledUseCase(productRepository);
  });

  it('is defined', () => {
    expect(useCase).toBeDefined();
  });

  it('translates a missing product into a NotFoundException', async () => {
    productRepository.getProductById.mockResolvedValue(null);

    await expect(useCase.execute('product-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(productRepository.setDisabled).not.toHaveBeenCalled();
  });

  it('translates a soft-deleted product into a NotFoundException', async () => {
    const deletedProduct = Product.restore({
      ...enabledProduct,
      deletedAt: new Date(),
    });
    productRepository.getProductById.mockResolvedValue(deletedProduct);

    await expect(useCase.execute('product-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(productRepository.setDisabled).not.toHaveBeenCalled();
  });

  it('disables an enabled product and returns the updated product', async () => {
    const persistedProduct = Product.restore({
      ...enabledProduct,
      disabled: true,
    });
    productRepository.getProductById.mockResolvedValue(enabledProduct);
    productRepository.setDisabled.mockResolvedValue(persistedProduct);

    const result = await useCase.execute('product-id');

    expect(productRepository.setDisabled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-id', disabled: true }),
    );
    expect(result).toBe(persistedProduct);
  });

  it('enables a disabled product and returns the updated product', async () => {
    const persistedProduct = Product.restore({
      ...disabledProduct,
      disabled: false,
    });
    productRepository.getProductById.mockResolvedValue(disabledProduct);
    productRepository.setDisabled.mockResolvedValue(persistedProduct);

    const result = await useCase.execute('product-id');

    expect(productRepository.setDisabled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-id', disabled: false }),
    );
    expect(result).toBe(persistedProduct);
  });

  it('translates unexpected errors into an InternalServerErrorException', async () => {
    productRepository.getProductById.mockResolvedValue(enabledProduct);
    productRepository.setDisabled.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(useCase.execute('product-id')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
