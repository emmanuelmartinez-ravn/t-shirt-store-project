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
import { Product } from '../../domain/models/product';
import { ProductRepository } from '../../infrastructure/repositories/product.repository';

@Injectable()
export class CreateProductUseCase {
  private readonly logger: Logger = new Logger(CreateProductUseCase.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(props: {
    name: string;
    description: string | null;
    categoryId: string;
  }): Promise<Product> {
    try {
      const category = await this.categoryRepository.getCategoryById(
        props.categoryId,
      );

      if (!category || category.deletedAt) {
        throw new ProductCategoryNotFoundError(props.categoryId);
      }

      const product = Product.create(props);
      const createdProduct =
        await this.productRepository.createProduct(product);
      this.logger.log(`Created product ${createdProduct.name}`);
      return createdProduct;
    } catch (error) {
      this.logger.error(`Failed to create product ${props.name}`, error);

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
