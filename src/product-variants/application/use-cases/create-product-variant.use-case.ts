import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductRepository } from '../../../products/infrastructure/repositories/product.repository';
import { ProductVariantAlreadyExistsError } from '../../domain/errors/product-variant-already-exists';
import { VariantProductNotFoundError } from '../../domain/errors/variant-product-not-found';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';

@Injectable()
export class CreateProductVariantUseCase {
  private readonly logger: Logger = new Logger(
    CreateProductVariantUseCase.name,
  );

  constructor(
    private readonly productVariantRepository: ProductVariantRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(props: {
    productId: string;
    price: number;
    stock: number;
    attributes: Record<string, string>;
  }): Promise<ProductVariant> {
    try {
      const product = await this.productRepository.getProductById(
        props.productId,
      );

      if (!product || product.deletedAt) {
        throw new VariantProductNotFoundError(props.productId);
      }

      const sku = ProductVariant.generateSku(product.code, props.attributes);
      const variant = ProductVariant.create({
        sku,
        price: props.price,
        stock: props.stock,
        attributes: props.attributes,
        productId: props.productId,
      });
      const createdVariant =
        await this.productVariantRepository.createProductVariant(variant);
      this.logger.log(`Created product variant ${createdVariant.sku}`);
      return createdVariant;
    } catch (error) {
      this.logger.error(
        `Failed to create product variant for product ${props.productId}`,
        error,
      );

      if (error instanceof VariantProductNotFoundError) {
        throw new NotFoundException({
          error: 'Product not found',
          details: [],
        });
      }
      if (error instanceof ProductVariantAlreadyExistsError) {
        throw new ConflictException({
          error: 'Product variant already exists',
          details: ['sku must be unique'],
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
