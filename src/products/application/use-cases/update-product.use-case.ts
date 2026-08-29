import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from '../../../categories/infrastructure/repositories/category.repository';
import { ProductAlreadyExistsError } from '../../domain/errors/product-already-exists';
import { ProductCategoryNotFoundError } from '../../domain/errors/product-category-not-found';
import { ProductNotFoundError } from '../../domain/errors/product-not-found';
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger: Logger = new Logger(UpdateProductUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    id: string,
    props: { name: string; description: string | null; categoryId: string },
  ): Promise<Product> {
    try {
      const existingProduct = await this.productRepository.getProductById(id);

      if (!existingProduct || existingProduct.deletedAt) {
        throw new ProductNotFoundError(id);
      }

      const category = await this.categoryRepository.getCategoryById(
        props.categoryId,
      );

      if (!category || category.deletedAt) {
        throw new ProductCategoryNotFoundError(props.categoryId);
      }

      const updatedProduct = Product.update(existingProduct, props);
      const persistedProduct =
        await this.productRepository.updateProduct(updatedProduct);
      this.logger.log(`Updated product ${persistedProduct.name}`);
      return persistedProduct;
    } catch (error) {
      this.logger.error(`Failed to update product ${id}`, error);

      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException({
          error: 'Product not found',
          details: [],
        });
      }

      if (error instanceof ProductCategoryNotFoundError) {
        throw new NotFoundException({
          error: 'Category not found',
          details: [],
        });
      }

      if (error instanceof ProductAlreadyExistsError) {
        throw new ConflictException({
          error: 'Product already exists',
          details: ['name must be unique'],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
