import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProductVariantRepository } from '../../../product-variants/infrastructure/repositories/product-variant.repository';
import { AlreadyLikedError } from '../../domain/errors/already-liked';
import { ProductVariantNotFoundError } from '../../domain/errors/product-variant-not-found';
import { LikedProductVariant } from '../../domain/models/liked-product-variant';
import { LikedProductVariantRepository } from '../../infrastructure/repositories/liked-product-variant.repository';

@Injectable()
export class LikeProductVariantUseCase {
  private readonly logger: Logger = new Logger(LikeProductVariantUseCase.name);

  constructor(
    private readonly likedProductVariantRepository: LikedProductVariantRepository,
    private readonly productVariantRepository: ProductVariantRepository,
  ) {}

  async execute(props: {
    userId: string;
    productVariantId: string;
  }): Promise<LikedProductVariant> {
    try {
      const variant = await this.productVariantRepository.getProductVariantById(
        props.productVariantId,
      );

      if (!variant || variant.deletedAt) {
        throw new ProductVariantNotFoundError(props.productVariantId);
      }

      const likedProductVariant = LikedProductVariant.create({
        userId: props.userId,
        productVariantId: props.productVariantId,
      });
      const created =
        await this.likedProductVariantRepository.like(likedProductVariant);

      this.logger.log(
        `User ${props.userId} liked product variant ${props.productVariantId}`,
      );
      return created;
    } catch (error) {
      this.logger.error(
        `Failed to like product variant ${props.productVariantId} for user ${props.userId}`,
        error,
      );

      if (error instanceof ProductVariantNotFoundError) {
        throw new NotFoundException({
          error: 'Product variant not found',
          details: [],
        });
      }

      if (error instanceof AlreadyLikedError) {
        throw new ConflictException({
          error: 'Product variant already liked',
          details: [],
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException({ error: message, details: [] });
    }
  }
}
