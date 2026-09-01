import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariantNotFoundError } from '../../domain/errors/product-variant-not-found';
import { ProductVariant } from '../../domain/models/product-variant';
import { ProductVariantRepository } from '../../infrastructure/repositories/product-variant.repository';

@Injectable()
export class UpdateProductVariantUseCase {
  private readonly logger: Logger = new Logger(
    UpdateProductVariantUseCase.name,
  );

  constructor(
    private readonly productVariantRepository: ProductVariantRepository,
  ) {}

  async execute(
    id: string,
    props: { price: number; stock: number },
  ): Promise<ProductVariant> {
    try {
      const existingVariant =
        await this.productVariantRepository.getProductVariantById(id);

      if (!existingVariant || existingVariant.deletedAt) {
        throw new ProductVariantNotFoundError(id);
      }

      const updatedVariant = ProductVariant.update(existingVariant, props);
      const persistedVariant =
        await this.productVariantRepository.updateProductVariant(
          updatedVariant,
        );
      this.logger.log(`Updated product variant ${persistedVariant.sku}`);
      return persistedVariant;
    } catch (error) {
      this.logger.error(`Failed to update product variant ${id}`, error);

      if (error instanceof ProductVariantNotFoundError) {
        throw new NotFoundException({
          error: 'Product variant not found',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
