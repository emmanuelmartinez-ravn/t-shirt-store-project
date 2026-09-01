import {
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariantAlreadyDeletedError } from '../../domain/errors/product-variant-already-deleted';
import { ProductVariantNotFoundError } from '../../domain/errors/product-variant-not-found';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';

@Injectable()
export class DeleteProductVariantUseCase {
  private readonly logger: Logger = new Logger(
    DeleteProductVariantUseCase.name,
  );

  constructor(
    private readonly productVariantRepository: ProductVariantRepository,
  ) {}

  async execute(id: string): Promise<ProductVariant> {
    try {
      const existingVariant =
        await this.productVariantRepository.getProductVariantById(id);

      if (!existingVariant) {
        throw new ProductVariantNotFoundError(id);
      }

      if (existingVariant.deletedAt) {
        throw new ProductVariantAlreadyDeletedError(id);
      }

      const deletedVariant = ProductVariant.delete(existingVariant);
      const persistedVariant =
        await this.productVariantRepository.deleteProductVariant(
          deletedVariant,
        );
      this.logger.log(`Deleted product variant ${persistedVariant.sku}`);
      return persistedVariant;
    } catch (error) {
      this.logger.error(`Failed to delete product variant ${id}`, error);

      if (error instanceof ProductVariantNotFoundError) {
        throw new NotFoundException({
          error: 'Product variant not found',
          details: [],
        });
      }

      if (error instanceof ProductVariantAlreadyDeletedError) {
        throw new GoneException({
          error: 'Product variant already deleted',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
